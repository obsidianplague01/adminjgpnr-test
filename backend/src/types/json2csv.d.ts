// src/types/json2csv.d.ts
declare module 'json2csv' {
  export interface Json2CsvOptions {
    fields?: string[];
    delimiter?: string;
    quote?: string;
    header?: boolean;
    includeEmptyRows?: boolean;
    withBOM?: boolean;
  }

  export class Parser {
    constructor(options?: Json2CsvOptions);
    parse(data: any): string;
  }

  export function parse(data: any, options?: Json2CsvOptions): string;
}