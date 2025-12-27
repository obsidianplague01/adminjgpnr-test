// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@jgpnr.com' },
    update: {},
    create: {
      email: 'admin@jgpnr.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // Create Regular Admin
  const admin = await prisma.user.upsert({
    where: { email: 'staff@jgpnr.com' },
    update: {},
    create: {
      email: 'staff@jgpnr.com',
      password: hashedPassword,
      firstName: 'Staff',
      lastName: 'Member',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create Ticket Settings
  const settings = await prisma.ticketSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      maxScanCount: 2,
      scanWindowDays: 14,
      validityDays: 30,
      basePrice: 2500,
      allowRefunds: true,
      allowTransfers: true,
      enableCategories: false,
    },
  });
  console.log('✅ Ticket settings created');

  // Create Sample Customers
  const customer1 = await prisma.customer.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+234-801-234-5678',
      location: 'Lagos',
      status: 'active',
    },
  });
  console.log('✅ Sample customer created:', customer1.email);

  const customer2 = await prisma.customer.create({
    data: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+234-802-345-6789',
      location: 'Abuja',
      status: 'active',
    },
  });
  console.log('✅ Sample customer created:', customer2.email);

  // Create Sample Order
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20240101-1001',
      customerId: customer1.id,
      quantity: 2,
      amount: 5000,
      status: 'COMPLETED',
      purchaseDate: new Date(),
    },
  });
  console.log('✅ Sample order created:', order.orderNumber);

  // Create Sample Tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketCode: 'JGPNR-2024-ABC123',
      orderId: order.id,
      gameSession: 'Morning Session',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      maxScans: 2,
      scanWindow: 14,
    },
  });
  console.log('✅ Sample ticket created:', ticket1.ticketCode);

  // Create Email Template
  const template = await prisma.emailTemplate.create({
    data: {
      name: 'Order Confirmation',
      subject: 'Your JGPNR Order Confirmation',
      body: `
        <h1>Thank you for your order!</h1>
        <p>Hi {firstName},</p>
        <p>Your order <strong>{orderNumber}</strong> has been confirmed.</p>
        <p>You will receive your tickets shortly.</p>
        <p>Best regards,<br>JGPNR Team</p>
      `,
      category: 'transactional',
      status: 'active',
    },
  });
  console.log('✅ Email template created:', template.name);

  // Create Sample Subscribers
  await prisma.subscriber.createMany({
    data: [
      {
        email: 'subscriber1@example.com',
        name: 'Subscriber One',
        source: 'website',
        status: 'active',
      },
      {
        email: 'subscriber2@example.com',
        name: 'Subscriber Two',
        source: 'manual',
        status: 'active',
      },
    ],
  });
  console.log('✅ Sample subscribers created');

  console.log('🎉 Database seeding completed!');
  console.log('\n📝 Login Credentials:');
  console.log('Email: admin@jgpnr.com');
  console.log('Password: Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });