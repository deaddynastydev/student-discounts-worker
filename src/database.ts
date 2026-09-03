/**
 * Модуль для работы с базой данных Cloudflare D1
 */

import { Env, City, Discount } from './types';

export class DatabaseManager {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  /**
   * Создание таблиц в базе данных
   * Вызывается при каждом запросе (безопасно благодаря IF NOT EXISTS)
   */
  async createTables(): Promise<void> {
    await this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS cities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    await this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS venues (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          city_id INTEGER,
          name TEXT NOT NULL,
          address TEXT,
          website_url TEXT,
          category TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    await this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS discounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          venue_id INTEGER,
          description TEXT NOT NULL,
          discount_percent INTEGER,
          discount_price INTEGER,
          conditions TEXT,
          is_active INTEGER DEFAULT 1,
          parsed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    // Индексы для ускорения поиска
    await this.db
      .prepare(`CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city_id)`)
      .run();
    await this.db
      .prepare(`CREATE INDEX IF NOT EXISTS idx_discounts_venue ON discounts(venue_id)`)
      .run();
  }

  /**
   * Получение списка всех городов
   */
  async getCities(): Promise<City[]> {
    const result = await this.db
      .prepare('SELECT id, name FROM cities ORDER BY name')
      .all<City>();
    return result.results;
  }

  /**
   * Получение всех скидок для города
   */
  async getDiscountsByCity(cityId: number): Promise<Discount[]> {
    const result = await this.db
      .prepare(
        `SELECT d.*, v.name as venue_name, v.address as venue_address
         FROM discounts d
         JOIN venues v ON d.venue_id = v.id
         WHERE v.city_id = ? AND d.is_active = 1
         ORDER BY d.parsed_at DESC`
      )
      .bind(cityId)
      .all<Discount>();
    return result.results;
  }

  /**
   * Добавление города (если уже есть - вернёт существующий ID)
   */
  async addCity(name: string): Promise<number> {
    // Сначала пробуем найти существующий
    const existing = await this.db
      .prepare('SELECT id FROM cities WHERE name = ?')
      .bind(name)
      .first<{ id: number }>();

    if (existing) return existing.id;

    // Если нет - создаём
    const result = await this.db
      .prepare('INSERT INTO cities (name) VALUES (?) RETURNING id')
      .bind(name)
      .first<{ id: number }>();

    return result?.id || 0;
  }

  /**
   * Добавление заведения
   */
  async addVenue(
    cityId: number,
    name: string,
    address: string | null,
    websiteUrl: string | null,
    category: string | null
  ): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO venues (city_id, name, address, website_url, category)
         VALUES (?, ?, ?, ?, ?) RETURNING id`
      )
      .bind(cityId, name, address, websiteUrl, category)
      .first<{ id: number }>();

    return result?.id || 0;
  }

  /**
   * Добавление скидки
   */
  async addDiscount(
    venueId: number,
    description: string,
    percent: number | null,
    price: number | null,
    conditions: string | null
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO discounts (venue_id, description, discount_percent, discount_price, conditions, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`
      )
      .bind(venueId, description, percent, price, conditions)
      .run();
  }
}