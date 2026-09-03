/**
 * Типы данных для проекта
 */

// Binding'и Cloudflare (база данных и переменные окружения)
export interface Env {
  DB: D1Database;
}

// Модель города
export interface City {
  id: number;
  name: string;
  created_at?: string;
}

// Модель заведения
export interface Venue {
  id: number;
  city_id: number;
  name: string;
  address: string | null;
  website_url: string | null;
  category: string | null;
}

// Модель скидки
export interface Discount {
  id: number;
  venue_id: number;
  description: string;
  discount_percent: number | null;
  discount_price: number | null;
  conditions: string | null;
  is_active: number;
  venue_name?: string;
  venue_address?: string | null;
}

// Результат парсинга
export interface ParsingResult {
  success: boolean;
  venues_found: number;
  discounts_found: number;
  error_message?: string;
}