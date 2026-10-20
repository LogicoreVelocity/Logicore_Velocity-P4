declare module "pg" {
  export type QueryResult<T = any> = {
    rows: T[];
  };

  export type PoolConfig = {
    connectionString?: string;
    [key: string]: any;
  };

  export interface PoolClient {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
