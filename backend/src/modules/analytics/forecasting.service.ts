import * as ss from 'simple-statistics';
import * as regression from 'regression';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { viewService } from '../../utils/materialized-views.service';

export interface ForecastDataPoint {
  date: string;
  actual?: number;
  forecast?: number;
  upper?: number;
  lower?: number;
}

export interface ForecastResult {
  historical: ForecastDataPoint[];
  forecast: ForecastDataPoint[];
  accuracy: {
    mape: number;
    rmse: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

export class ForecastingService {
  async forecastRevenue(days: number = 30): Promise<ForecastResult> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90);
    
    const historicalData = await viewService.getDailyRevenue(startDate, endDate);
    
    if (historicalData.length < 14) {
      throw new Error('Insufficient historical data for forecasting (minimum 14 days)');
    }
    
    const data = historicalData.map((d, index) => ({
      x: index,
      y: d.revenue,
      date: d.date
    }));
    
    const regressionData = data.map(d => [d.x, d.y] as [number, number]);
    const linearModel = regression.linear(regressionData);
    
    const residuals = data.map(d => d.y - linearModel.predict(d.x)[1]);
    const standardError = ss.standardDeviation(residuals);
    const confidenceMultiplier = 1.96;
    
    const historical: ForecastDataPoint[] = data.map(d => ({
      date: d.date.toISOString().split('T')[0],
      actual: d.y,
      forecast: linearModel.predict(d.x)[1]
    }));
    
    const forecast: ForecastDataPoint[] = [];
    const lastIndex = data.length - 1;
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(endDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      const xValue = lastIndex + i;
      const predicted = linearModel.predict(xValue)[1];
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        forecast: Math.max(0, predicted),
        upper: Math.max(0, predicted + confidenceMultiplier * standardError),
        lower: Math.max(0, predicted - confidenceMultiplier * standardError)
      });
    }
    
    const errors = residuals.map(Math.abs);
    const mape = (ss.mean(errors.map((e, i) => e / data[i].y)) * 100);
    const rmse = Math.sqrt(ss.mean(residuals.map(r => r * r)));
    
    const slope = linearModel.equation[0];
    const trend = slope > 100 ? 'increasing' : slope < -100 ? 'decreasing' : 'stable';
    
    const confidence = Math.min(100, Math.max(0, 100 - mape));
    
    logger.info(`Revenue forecast generated: ${days} days, MAPE: ${mape.toFixed(2)}%, Trend: ${trend}`);
    
    return {
      historical,
      forecast,
      accuracy: {
        mape: parseFloat(mape.toFixed(2)),
        rmse: parseFloat(rmse.toFixed(2))
      },
      trend,
      confidence: parseFloat(confidence.toFixed(2))
    };
  }

  async forecastTicketSales(days: number = 30): Promise<ForecastResult> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90);
    
    const historicalData = await viewService.getDailyRevenue(startDate, endDate);
    
    const data = historicalData.map((d, index) => ({
      x: index,
      y: d.ticketsSold,
      date: d.date
    }));
    
    return this.performForecast(data, days, endDate);
  }

  async forecastCustomerGrowth(days: number = 30): Promise<ForecastResult> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90);
    
    const dailyCustomers = await prisma.$queryRaw<Array<{
      date: Date;
      new_customers: number;
    }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_customers
      FROM customers
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    
    const data = dailyCustomers.map((d, index) => ({
      x: index,
      y: Number(d.new_customers),
      date: d.date
    }));
    
    return this.performForecast(data, days, endDate);
  }

  private performForecast(
    data: Array<{ x: number; y: number; date: Date }>,
    days: number,
    endDate: Date
  ): ForecastResult {
    const regressionData = data.map(d => [d.x, d.y] as [number, number]);
    const linearModel = regression.linear(regressionData);
    
    const residuals = data.map(d => d.y - linearModel.predict(d.x)[1]);
    const standardError = ss.standardDeviation(residuals);
    
    const historical: ForecastDataPoint[] = data.map(d => ({
      date: d.date.toISOString().split('T')[0],
      actual: d.y,
      forecast: linearModel.predict(d.x)[1]
    }));
    
    const forecast: ForecastDataPoint[] = [];
    const lastIndex = data.length - 1;
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(endDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      const predicted = linearModel.predict(lastIndex + i)[1];
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        forecast: Math.max(0, predicted),
        upper: Math.max(0, predicted + 1.96 * standardError),
        lower: Math.max(0, predicted - 1.96 * standardError)
      });
    }
    
    const errors = residuals.map(Math.abs);
    const mape = ss.mean(errors.map((e, i) => e / data[i].y)) * 100;
    const rmse = Math.sqrt(ss.mean(residuals.map(r => r * r)));
    
    const slope = linearModel.equation[0];
    const trend = slope > 5 ? 'increasing' : slope < -5 ? 'decreasing' : 'stable';
    
    return {
      historical,
      forecast,
      accuracy: {
        mape: parseFloat(mape.toFixed(2)),
        rmse: parseFloat(rmse.toFixed(2))
      },
      trend,
      confidence: parseFloat(Math.min(100, Math.max(0, 100 - mape)).toFixed(2))
    };
  }
}

export const forecastingService = new ForecastingService();