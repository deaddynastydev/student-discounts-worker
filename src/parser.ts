/**
 * Модуль парсинга сайтов
 * Ищет упоминания студенческих скидок на сайтах заведений
 */

import * as cheerio from 'cheerio';
import { Env, ParsingResult } from './types';
import { DatabaseManager } from './database';

// Ключевые слова для поиска скидок на странице
const STUDENT_KEYWORDS = [
  'студенч',
  'скидк',
  'льгот',
  'студент',
  'учащ',
  'школьник',
];

export class StudentDiscountParser {
  private env: Env;
  private db: DatabaseManager;

  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseManager(env);
  }

  /**
   * Парсинг одного сайта
   */
  async parseWebsite(url: string, cityId: number): Promise<ParsingResult> {
    const result: ParsingResult = {
      success: false,
      venues_found: 0,
      discounts_found: 0,
    };

    try {
      // Загружаем HTML страницы
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Добавляем заведение в БД
      const venueId = await this.db.addVenue(cityId, 'Заведение', null, url, 'категория');
      result.venues_found = 1;

      // Ищем упоминания студенческих скидок на странице
      $('p, li, div, span, h1, h2, h3, h4, h5, h6').each((_, element) => {
        const text = $(element).text().toLowerCase().trim();

        // Проверяем, есть ли ключевые слова
        const hasKeyword = STUDENT_KEYWORDS.some((keyword) => text.includes(keyword));

        if (hasKeyword && text.length > 10 && text.length < 500) {
          // Извлекаем процент скидки
          const percentMatch = text.match(/(\d+)\s*%/);
          const percent = percentMatch ? parseInt(percentMatch[1]) : null;

          // Извлекаем цену
          const priceMatch = text.match(/(\d+)\s*(руб|₽|р\.?)/i);
          const price = priceMatch ? parseInt(priceMatch[1]) : null;

          // Сохраняем скидку в БД
          this.db.addDiscount(venueId, text.substring(0, 500), percent, price, null);
          result.discounts_found++;
        }
      });

      result.success = true;
      console.log(`✅ Найдено скидок: ${result.discounts_found}`);
    } catch (error) {
      result.success = false;
      result.error_message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Ошибка парсинга: ${result.error_message}`);
    }

    return result;
  }

  /**
   * Запуск всех парсеров
   */
  async runAllParsers(): Promise<ParsingResult[]> {
    console.log('🚀 Запуск парсеров...');

    // Добавляем города
    const moscowId = await this.db.addCity('Москва');
    const spbId = await this.db.addCity('Санкт-Петербург');
    const kazanId = await this.db.addCity('Казань');

    const results: ParsingResult[] = [];

    // Парсим сайты (можно добавить свои URL)
    const sitesToParse = [
      { url: 'https://karofilm.ru/', cityId: moscowId },
    ];

    for (const site of sitesToParse) {
      const result = await this.parseWebsite(site.url, site.cityId);
      results.push(result);
    }

    console.log('✅ Все парсеры завершены');
    return results;
  }
}