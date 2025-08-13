export interface Product {
  brand?: string;
  model?: string;
  price?: number;
  gender?: string | string[];
  hidden?: boolean;
  image?: string;
  sizes?: number[];
  description?: string;
  [key: string]: any;
}
