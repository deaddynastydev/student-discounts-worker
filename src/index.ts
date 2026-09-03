/**
 * Точка входа Worker API
 * Обрабатывает HTTP-запросы и Cron-триггеры
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { DatabaseManager } from './database';
import { StudentDiscountParser } from './parser';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - разрешаем запросы с любого домена
app.use('*', cors());

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /api/health
 * Проверка работоспособности API
 */
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/cities
 * Получить список всех городов
 */
app.get('/api/cities', async (c) => {
  const db = new DatabaseManager(c.env);
  await db.createTables();
  const cities = await db.getCities();
  return c.json(cities);
});

/**
 * GET /api/cities/:id/discounts
 * Получить все скидки для конкретного города
 */
app.get('/api/cities/:id/discounts', async (c) => {
  const cityId = parseInt(c.req.param('id'));
  if (isNaN(cityId)) {
    return c.json({ error: 'Invalid city ID' }, 400);
  }

  const db = new DatabaseManager(c.env);
  await db.createTables();
  const discounts = await db.getDiscountsByCity(cityId);
  return c.json(discounts);
});

/**
 * POST /api/parse
 * Запустить парсинг вручную (для тестирования)
 */
app.post('/api/parse', async (c) => {
  const db = new DatabaseManager(c.env);
  await db.createTables();

  const parser = new StudentDiscountParser(c.env);
  const results = await parser.runAllParsers();

  return c.json({ success: true, results });
});

// ============================================
// EXPORT
// ============================================

export default {
  // Обработчик HTTP-запросов
  fetch: app.fetch,

  // Cron триггер - запускается автоматически по расписанию
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('⏰ Cron trigger activated');
    const db = new DatabaseManager(env);
    await db.createTables();

    const parser = new StudentDiscountParser(env);
    await parser.runAllParsers();
  },
};