"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AdvancedConfigStepProps } from "@/types/assistant"
import { SchemaPreview } from "@/app/(dashboard)/assistants/add/_components/schema-preview"
import { Shield, Key, Lock, BookOpen } from "lucide-react"
import { parseSchemaText, parseOpenAPISchema } from "@/lib/openapi-parser"

// Example OpenAPI schemas
const EXAMPLE_SCHEMAS = {
  sharepoint: {
    name: "Microsoft SharePoint API",
    schema: `openapi: 3.0.1

info:
  title: Microsoft SharePoint API
  version: 1.0.0
  description: Access SharePoint site lists and files via Microsoft Graph

servers:
  - url: https://graph.microsoft.com/v1.0

components:
  securitySchemes:
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
          tokenUrl: https://login.microsoftonline.com/common/oauth2/v2.0/token
          scopes:
            Sites.Read.All: Read items in all site collections
            Files.ReadWrite.All: Read and write user files

security:
  - oauth2: [Sites.Read.All]

paths:
  /sites/{siteId}/lists:
    get:
      summary: Get lists in a SharePoint site
      operationId: getLists
      parameters:
        - name: siteId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: A list of SharePoint lists
          content:
            application/json:
              schema:
                type: object
                properties:
                  value:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        description:
                          type: string

  /sites/{siteId}/lists/{listId}/items:
    get:
      summary: Get list items from a SharePoint list
      operationId: getListItems
      parameters:
        - name: siteId
          in: path
          required: true
          schema:
            type: string
        - name: listId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  value:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        fields:
                          type: object`
  },
  weather: {
    name: "Weather API",
    schema: `openapi: 3.0.1

info:
  title: Weather API
  version: 1.0.0
  description: Get current weather data for a given city

servers:
  - url: https://api.openweathermap.org/data/2.5

components:
  securitySchemes:
    api_key:
      type: apiKey
      in: query
      name: appid

security:
  - api_key: []

paths:
  /weather:
    get:
      summary: Get current weather
      operationId: getWeather
      parameters:
        - name: q
          in: query
          description: City name
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                  weather:
                    type: array
                    items:
                      type: object
                      properties:
                        main:
                          type: string
                        description:
                          type: string`
  },
  advice: {
    name: "Advice Slip API",
    schema: `openapi: 3.0.1

info:
  title: Advice Slip API
  version: 1.0.0
  description: Get random advice quotes

servers:
  - url: https://api.adviceslip.com

paths:
  /advice:
    get:
      summary: Get random advice
      operationId: getAdvice
      responses:
        "200":
          description: Random advice response
          content:
            application/json:
              schema:
                type: object
                properties:
                  slip:
                    type: object
                    properties:
                      id:
                        type: integer
                      advice:
                        type: string`
  },
  seo: {
    name: "SEO Assistant API (DataForSEO)",
    schema: `openapi: 3.1.0
info:
  title: SEO Assistant API
  description: >
    Full-stack SEO intelligence via DataForSEO API.
    Covers SERP analysis, keyword research, backlink audits,
    on-page SEO, competitor analysis, and rank tracking.
  version: 1.0.0

servers:
  - url: https://api.dataforseo.com
    description: DataForSEO Main API

components:
  securitySchemes:
    BasicAuth:
      type: http
      scheme: basic
      description: >
        Use your DataForSEO login email as username
        and API password as password (Base64 encoded)

  schemas:
    TaskRequest:
      type: object
      properties:
        id:          { type: string }
        status_code: { type: integer }
        status_message: { type: string }
        result:
          type: array
          items: { type: object }

    KeywordData:
      type: object
      properties:
        keyword:          { type: string }
        search_volume:    { type: integer }
        competition:      { type: number }
        competition_level: { type: string, enum: [LOW, MEDIUM, HIGH] }
        cpc:              { type: number, description: Cost per click in USD }
        monthly_searches:
          type: array
          items:
            type: object
            properties:
              year:         { type: integer }
              month:        { type: integer }
              search_volume: { type: integer }

    SerpResult:
      type: object
      properties:
        keyword:      { type: string }
        type:         { type: string }
        rank_group:   { type: integer }
        rank_absolute: { type: integer }
        domain:       { type: string }
        title:        { type: string }
        description:  { type: string }
        url:          { type: string }

    BacklinkData:
      type: object
      properties:
        url_from:       { type: string }
        url_to:         { type: string }
        domain_from:    { type: string }
        domain_rank:    { type: integer }
        page_from_rank: { type: integer }
        dofollow:       { type: boolean }
        anchor:         { type: string }
        first_seen:     { type: string }
        last_seen:      { type: string }
        spam_score:     { type: integer }

security:
  - BasicAuth: []

paths:

  /v3/keywords_data/google_ads/search_volume/live:
    post:
      operationId: getKeywordSearchVolume
      summary: Get search volume, CPC & competition for keywords
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [keywords, location_name, language_name]
                properties:
                  keywords:
                    type: array
                    description: Up to 1000 keywords per request
                    items: { type: string }
                    example: ["seo tools", "best seo software", "keyword research"]
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
                  date_from:
                    type: string
                    format: date
                    example: "2024-01-01"
                  date_to:
                    type: string
                    format: date
      responses:
        "200":
          description: Search volume data per keyword

  /v3/keywords_data/google_ads/keywords_for_keywords/live:
    post:
      operationId: getRelatedKeywords
      summary: Discover related keywords and keyword ideas
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [keywords, location_name, language_name]
                properties:
                  keywords:
                    type: array
                    items: { type: string }
                    example: ["content marketing"]
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
                  order_by:
                    type: array
                    items: { type: string }
                    example: ["search_volume,desc"]
                  limit:
                    type: integer
                    default: 100
                    maximum: 1000
      responses:
        "200":
          description: Related keyword suggestions with metrics

  /v3/dataforseo_labs/google/keyword_suggestions/live:
    post:
      operationId: getKeywordSuggestions
      summary: Get long-tail keyword suggestions with difficulty scores
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [keyword, location_name, language_name]
                properties:
                  keyword:
                    type: string
                    example: "digital marketing"
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
                  include_seed_keyword:
                    type: boolean
                    default: true
                  limit:
                    type: integer
                    default: 100
      responses:
        "200":
          description: Keyword suggestions with SEO difficulty

  /v3/dataforseo_labs/google/keyword_difficulty/live:
    post:
      operationId: getKeywordDifficulty
      summary: Get keyword difficulty scores (0-100) for target keywords
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [keywords, location_name, language_name]
                properties:
                  keywords:
                    type: array
                    items: { type: string }
                    example: ["seo tools", "rank tracking software"]
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
      responses:
        "200":
          description: Keyword difficulty score per keyword (0=easy, 100=very hard)

  /v3/serp/google/organic/live/advanced:
    post:
      operationId: getSerpResults
      summary: Get live Google SERP results for any keyword
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [keyword, location_name, language_name]
                properties:
                  keyword:
                    type: string
                    example: "best seo tools 2025"
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
                  device:
                    type: string
                    enum: [desktop, mobile]
                    default: desktop
                  depth:
                    type: integer
                    description: Number of results (10, 20, 30... up to 700)
                    default: 10
      responses:
        "200":
          description: Full SERP with organic results, featured snippets, PAA, ads

  /v3/serp/google/local_pack/live/regular:
    post:
      operationId: getLocalPack
      summary: Get Google Local Pack (Maps) results for local SEO
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [keyword, location_name]
                properties:
                  keyword:
                    type: string
                    example: "plumber near me"
                  location_name:
                    type: string
                    example: "New York,New York,United States"
                  language_name:
                    type: string
                    example: "English"
      responses:
        "200":
          description: Local Pack map results with ratings and addresses

  /v3/dataforseo_labs/google/competitors_domain/live:
    post:
      operationId: getCompetitors
      summary: Find top organic competitors for any domain
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target, location_name, language_name]
                properties:
                  target:
                    type: string
                    description: Your domain (no https://)
                    example: "ahrefs.com"
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
                  limit:
                    type: integer
                    default: 20
      responses:
        "200":
          description: List of competing domains with overlap scores

  /v3/dataforseo_labs/google/domain_rank_overview/live:
    post:
      operationId: getDomainRankOverview
      summary: Get organic traffic estimate, keyword count & domain authority
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target, location_name, language_name]
                properties:
                  target:
                    type: string
                    example: "semrush.com"
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
      responses:
        "200":
          description: Domain authority, estimated organic traffic, keyword rankings count

  /v3/dataforseo_labs/google/ranked_keywords/live:
    post:
      operationId: getDomainKeywords
      summary: Get all keywords a domain ranks for (spy on competitors)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target, location_name, language_name]
                properties:
                  target:
                    type: string
                    example: "moz.com"
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
                  limit:
                    type: integer
                    default: 100
      responses:
        "200":
          description: Full keyword ranking list for the domain

  /v3/backlinks/summary/live:
    post:
      operationId: getBacklinkSummary
      summary: Get backlink overview - total links, referring domains, rank
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target]
                properties:
                  target:
                    type: string
                    description: Domain or URL to check
                    example: "example.com"
                  include_subdomains:
                    type: boolean
                    default: true
      responses:
        "200":
          description: Backlink summary including referring domains, total backlinks, domain rank

  /v3/backlinks/backlinks/live:
    post:
      operationId: getBacklinks
      summary: Get full list of backlinks pointing to a domain or URL
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target]
                properties:
                  target:
                    type: string
                    example: "example.com"
                  mode:
                    type: string
                    enum: [as_is, one_per_domain, one_per_anchor]
                    default: as_is
                  order_by:
                    type: array
                    items: { type: string }
                    example: ["domain_from_rank,desc"]
                  limit:
                    type: integer
                    default: 100
      responses:
        "200":
          description: Detailed backlink list with anchor text, spam score, DR

  /v3/backlinks/referring_domains/live:
    post:
      operationId: getReferringDomains
      summary: Get all referring domains linking to a target
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target]
                properties:
                  target:  { type: string }
                  limit:   { type: integer, default: 100 }
                  order_by:
                    type: array
                    items: { type: string }
                    example: ["domain_from_rank,desc"]
      responses:
        "200":
          description: Referring domains with domain rank and link counts

  /v3/backlinks/anchors/live:
    post:
      operationId: getAnchorTexts
      summary: Analyze anchor text distribution for backlinks
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target]
                properties:
                  target: { type: string, example: "example.com" }
                  limit:  { type: integer, default: 100 }
      responses:
        "200":
          description: Top anchor texts with link counts

  /v3/on_page/task_post:
    post:
      operationId: startSiteAudit
      summary: Launch a full on-page SEO crawl audit for a website
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target, max_crawl_pages]
                properties:
                  target:
                    type: string
                    example: "example.com"
                  max_crawl_pages:
                    type: integer
                    description: Max pages to crawl (1-10000)
                    default: 100
                  start_url:
                    type: string
                    example: "https://example.com"
                  enable_javascript:
                    type: boolean
                    default: false
                  load_resources:
                    type: boolean
                    default: true
                  check_spell:
                    type: boolean
                    default: false
      responses:
        "200":
          description: Task created - use task ID to fetch results

  /v3/on_page/summary/{task_id}:
    get:
      operationId: getSiteAuditSummary
      summary: Get summary of crawl audit results (errors, warnings, notices)
      parameters:
        - name: task_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Audit summary including broken links, missing titles, slow pages

  /v3/on_page/pages/{task_id}:
    get:
      operationId: getAuditPageDetails
      summary: Get per-page SEO issues from the crawl
      parameters:
        - name: task_id
          in: path
          required: true
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
      responses:
        "200":
          description: Detailed per-page SEO metrics and issues

  /v3/dataforseo_labs/google/historical_rank_overview/live:
    post:
      operationId: getHistoricalRanks
      summary: Track domain ranking changes over time
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [target, location_name, language_name]
                properties:
                  target:
                    type: string
                    example: "example.com"
                  location_name:
                    type: string
                    example: "United States"
                  language_name:
                    type: string
                    example: "English"
      responses:
        "200":
          description: Month-by-month ranking history with traffic estimates

  /v3/content_analysis/search/live:
    post:
      operationId: analyzeContent
      summary: Analyze content across the web for a keyword or topic
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                required: [keyword]
                properties:
                  keyword:
                    type: string
                    example: "artificial intelligence in healthcare"
                  order_by:
                    type: array
                    items: { type: string }
                    example: ["page_from_rank,desc"]
                  limit:
                    type: integer
                    default: 100
      responses:
        "200":
          description: Top content pieces ranking for this topic with their metrics

  /v3/serp/google/locations:
    get:
      operationId: getSupportedLocations
      summary: Get all supported countries/cities for geo-targeted SEO
      responses:
        "200":
          description: Full list of supported location names and codes

  /v3/serp/google/languages:
    get:
      operationId: getSupportedLanguages
      summary: Get all supported languages for SEO queries
      responses:
        "200":
          description: Full list of supported languages with codes`
  },
  trading: {
    name: "Trading Assistant API (Alpaca)",
    schema: `openapi: 3.1.0
info:
  title: Trading Assistant API
  description: >
    Real-time stock & crypto trading via Alpaca Markets.
    Supports account info, orders, positions, market data, and portfolio tracking.
  version: 1.0.0

servers:
  - url: https://paper-api.alpaca.markets
    description: Paper Trading (Free - No real money)
  - url: https://api.alpaca.markets
    description: Live Trading (Real money)
  - url: https://data.alpaca.markets
    description: Market Data

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: APCA-API-KEY-ID
    ApiSecretAuth:
      type: apiKey
      in: header
      name: APCA-API-SECRET-KEY

  schemas:
    Order:
      type: object
      properties:
        id:          { type: string }
        symbol:      { type: string, example: AAPL }
        qty:         { type: string, example: "10" }
        notional:    { type: string, description: Dollar amount instead of qty }
        side:        { type: string, enum: [buy, sell] }
        type:        { type: string, enum: [market, limit, stop, stop_limit, trailing_stop] }
        time_in_force: { type: string, enum: [day, gtc, opg, cls, ioc, fok] }
        limit_price: { type: string, example: "150.00" }
        stop_price:  { type: string, example: "145.00" }
        status:      { type: string }
        filled_qty:  { type: string }
        filled_avg_price: { type: string }
        created_at:  { type: string, format: date-time }

    Position:
      type: object
      properties:
        symbol:         { type: string }
        qty:            { type: string }
        avg_entry_price: { type: string }
        market_value:   { type: string }
        unrealized_pl:  { type: string }
        unrealized_plpc: { type: string }
        current_price:  { type: string }
        side:           { type: string }

    Account:
      type: object
      properties:
        id:               { type: string }
        status:           { type: string }
        currency:         { type: string }
        cash:             { type: string }
        portfolio_value:  { type: string }
        equity:           { type: string }
        buying_power:     { type: string }
        daytrade_count:   { type: integer }
        pattern_day_trader: { type: boolean }

security:
  - ApiKeyAuth: []
    ApiSecretAuth: []

paths:

  /v2/account:
    get:
      operationId: getAccount
      summary: Get account info, balance, and buying power
      servers:
        - url: https://paper-api.alpaca.markets
      responses:
        "200":
          description: Account details
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Account" }

  /v2/orders:
    get:
      operationId: listOrders
      summary: List all open or historical orders
      servers:
        - url: https://paper-api.alpaca.markets
      parameters:
        - name: status
          in: query
          schema: { type: string, enum: [open, closed, all], default: open }
        - name: limit
          in: query
          schema: { type: integer, default: 50, maximum: 500 }
        - name: direction
          in: query
          schema: { type: string, enum: [asc, desc], default: desc }
      responses:
        "200":
          description: List of orders
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Order" }

    post:
      operationId: placeOrder
      summary: Place a new buy or sell order
      servers:
        - url: https://paper-api.alpaca.markets
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [symbol, side, type, time_in_force]
              properties:
                symbol:
                  type: string
                  description: Stock ticker (e.g. AAPL, TSLA)
                qty:
                  type: string
                  description: Number of shares (use this OR notional)
                notional:
                  type: string
                  description: Dollar amount to invest (e.g. "500" = $500 worth)
                side:
                  type: string
                  enum: [buy, sell]
                type:
                  type: string
                  enum: [market, limit, stop, stop_limit, trailing_stop]
                time_in_force:
                  type: string
                  enum: [day, gtc, opg, cls, ioc, fok]
                  description: "day=today only, gtc=good till cancelled"
                limit_price:
                  type: string
                  description: Required for limit/stop_limit orders
                stop_price:
                  type: string
                  description: Required for stop/stop_limit orders
                trail_percent:
                  type: string
                  description: For trailing_stop orders (e.g. "2.5" = 2.5%)
      responses:
        "200":
          description: Order placed successfully
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Order" }

  /v2/orders/{order_id}:
    get:
      operationId: getOrder
      summary: Get details of a specific order
      servers:
        - url: https://paper-api.alpaca.markets
      parameters:
        - name: order_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Order details
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Order" }

    delete:
      operationId: cancelOrder
      summary: Cancel an open order
      servers:
        - url: https://paper-api.alpaca.markets
      parameters:
        - name: order_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Order cancelled successfully

  /v2/positions:
    get:
      operationId: getAllPositions
      summary: Get all current holdings and unrealized P&L
      servers:
        - url: https://paper-api.alpaca.markets
      responses:
        "200":
          description: List of positions
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Position" }

  /v2/positions/{symbol}:
    get:
      operationId: getPosition
      summary: Get position details for a specific stock
      servers:
        - url: https://paper-api.alpaca.markets
      parameters:
        - name: symbol
          in: path
          required: true
          schema: { type: string, example: AAPL }
      responses:
        "200":
          description: Position details
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Position" }

    delete:
      operationId: closePosition
      summary: Close/liquidate an entire position
      servers:
        - url: https://paper-api.alpaca.markets
      parameters:
        - name: symbol
          in: path
          required: true
          schema: { type: string }
        - name: qty
          in: query
          schema: { type: string, description: Partial close - number of shares }
        - name: percentage
          in: query
          schema: { type: string, description: "Partial close - e.g. 50 for 50%" }
      responses:
        "200":
          description: Position closed

  /v2/stocks/{symbol}/quotes/latest:
    get:
      operationId: getLatestQuote
      summary: Get latest bid/ask quote for a stock
      servers:
        - url: https://data.alpaca.markets
      parameters:
        - name: symbol
          in: path
          required: true
          schema: { type: string, example: AAPL }
      responses:
        "200":
          description: Latest quote
          content:
            application/json:
              schema:
                type: object
                properties:
                  symbol: { type: string }
                  quote:
                    type: object
                    properties:
                      ap: { type: number, description: Ask price }
                      bp: { type: number, description: Bid price }
                      as: { type: integer, description: Ask size }
                      bs: { type: integer, description: Bid size }
                      t:  { type: string, description: Timestamp }

  /v2/stocks/{symbol}/bars:
    get:
      operationId: getStockBars
      summary: Get OHLCV candlestick bars (historical price data)
      servers:
        - url: https://data.alpaca.markets
      parameters:
        - name: symbol
          in: path
          required: true
          schema: { type: string, example: TSLA }
        - name: timeframe
          in: query
          required: true
          schema:
            type: string
            enum: [1Min, 5Min, 15Min, 30Min, 1Hour, 1Day, 1Week, 1Month]
        - name: start
          in: query
          schema: { type: string, format: date-time, example: "2024-01-01T00:00:00Z" }
        - name: end
          in: query
          schema: { type: string, format: date-time }
        - name: limit
          in: query
          schema: { type: integer, default: 100, maximum: 10000 }
      responses:
        "200":
          description: Candlestick bars
          content:
            application/json:
              schema:
                type: object
                properties:
                  symbol: { type: string }
                  bars:
                    type: array
                    items:
                      type: object
                      properties:
                        t: { type: string, description: Timestamp }
                        o: { type: number, description: Open }
                        h: { type: number, description: High }
                        l: { type: number, description: Low }
                        c: { type: number, description: Close }
                        v: { type: integer, description: Volume }

  /v2/stocks/snapshots:
    get:
      operationId: getSnapshots
      summary: Get full market snapshot for multiple stocks at once
      servers:
        - url: https://data.alpaca.markets
      parameters:
        - name: symbols
          in: query
          required: true
          schema:
            type: string
            description: Comma-separated tickers
            example: "AAPL,TSLA,NVDA,MSFT"
      responses:
        "200":
          description: Snapshots with latest trade, quote, and daily bar
          content:
            application/json:
              schema:
                type: object
                additionalProperties:
                  type: object
                  properties:
                    latestTrade:
                      type: object
                      properties:
                        p: { type: number, description: Price }
                        s: { type: integer, description: Size }
                        t: { type: string, description: Timestamp }
                    dailyBar:
                      type: object
                      properties:
                        o: { type: number }
                        h: { type: number }
                        l: { type: number }
                        c: { type: number }
                        v: { type: integer }

  /v2/watchlists:
    get:
      operationId: getWatchlists
      summary: Get all saved watchlists
      servers:
        - url: https://paper-api.alpaca.markets
      responses:
        "200":
          description: List of watchlists

    post:
      operationId: createWatchlist
      summary: Create a new watchlist
      servers:
        - url: https://paper-api.alpaca.markets
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, symbols]
              properties:
                name:    { type: string, example: "My Tech Picks" }
                symbols:
                  type: array
                  items: { type: string }
                  example: [AAPL, NVDA, MSFT, GOOGL]
      responses:
        "200":
          description: Watchlist created

  /v2/clock:
    get:
      operationId: getMarketClock
      summary: Check if market is currently open
      servers:
        - url: https://paper-api.alpaca.markets
      responses:
        "200":
          description: Market clock
          content:
            application/json:
              schema:
                type: object
                properties:
                  timestamp:    { type: string }
                  is_open:      { type: boolean }
                  next_open:    { type: string }
                  next_close:   { type: string }`
  },
  diese: {
    name: "Diese Integration API (Pipedream)",
    schema: `openapi: 3.1.0
info:
  title: Diese Integration API
  description: >
    Universal API Integration & Data Mapping platform.
    Connect any app, transform data, manage workflows,
    trigger webhooks, and automate pipelines across all services.
    Powered by Pipedream (free tier) with Make.com & Zapier fallback schemas.
  version: 2.0.0

servers:
  - url: https://api.pipedream.com/v1
    description: Pipedream API (Recommended - Best Free Tier)
  - url: https://hook.eu1.make.com
    description: Make.com Webhook Ingestion
  - url: https://api.zapier.com/v1
    description: Zapier API (Paid)

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      description: Pipedream API Key - get from pipedream.com/settings/account
    ApiKeyHeader:
      type: apiKey
      in: header
      name: X-API-Key
      description: Used for Make.com / custom integration keys
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://pipedream.com/oauth/authorize
          tokenUrl: https://api.pipedream.com/v1/oauth/token
          scopes:
            workflows:read: Read workflow configurations
            workflows:write: Create and update workflows
            events:read: Read event data
            sources:write: Manage event sources
            connect:write: Manage connected accounts

  schemas:
    Workflow:
      type: object
      properties:
        id:          { type: string, example: "p_abc123" }
        name:        { type: string }
        active:      { type: boolean }
        created_at:  { type: integer, description: Unix timestamp }
        updated_at:  { type: integer }
        trigger:
          type: object
          properties:
            type:     { type: string, enum: [http, cron, email, app, sdk] }
            settings: { type: object }
        steps:
          type: array
          items:
            type: object
            properties:
              id:       { type: string }
              name:     { type: string }
              type:     { type: string }
              app:      { type: string }
              action:   { type: string }
              params:   { type: object }

    Source:
      type: object
      properties:
        id:          { type: string }
        name:        { type: string }
        active:      { type: boolean }
        type:        { type: string }
        app:         { type: string }
        webhook_url: { type: string }
        created_at:  { type: integer }

    Event:
      type: object
      properties:
        id:          { type: string }
        indexed_at:  { type: string }
        event:       { type: object, description: Raw event payload }
        metadata:
          type: object
          properties:
            id:       { type: string }
            emit_id:  { type: string }
            ts:       { type: integer }

    ConnectedAccount:
      type: object
      properties:
        id:          { type: string }
        name:        { type: string }
        app:         { type: string }
        healthy:     { type: boolean }
        dead:        { type: boolean }
        created_at:  { type: integer }

    DataMapping:
      type: object
      description: Transform and map data between platforms
      properties:
        source_field:    { type: string }
        target_field:    { type: string }
        transformation:
          type: string
          enum: [direct, uppercase, lowercase, trim, split, join, format_date,
                 number_format, json_parse, json_stringify, regex_replace,
                 conditional, calculate, lookup_table, base64_encode,
                 base64_decode, url_encode, md5_hash, custom_js]
        transformation_config:
          type: object
          properties:
            format:       { type: string }
            delimiter:    { type: string }
            pattern:      { type: string }
            replacement:  { type: string }
            condition:    { type: string }
            true_value:   { type: string }
            false_value:  { type: string }
            custom_code:  { type: string }

    Pipeline:
      type: object
      description: Multi-step data integration pipeline
      properties:
        id:          { type: string }
        name:        { type: string }
        description: { type: string }
        trigger:
          type: object
          properties:
            type:
              type: string
              enum: [webhook, schedule, manual, app_event, email, rss, database]
            cron:        { type: string, description: "Cron expression e.g. 0 9 * * 1-5" }
            webhook_url: { type: string }
        steps:
          type: array
          items:
            type: object
            properties:
              order:     { type: integer }
              name:      { type: string }
              type:
                type: string
                enum: [api_request, data_transform, filter, delay, branch,
                       loop, code, send_email, send_slack, send_webhook,
                       database_query, file_operation, ai_transform]
              config:    { type: object }
              on_error:
                type: string
                enum: [stop, continue, retry, fallback]

security:
  - BearerAuth: []

paths:

  /workflows:
    get:
      operationId: listWorkflows
      summary: List all integration workflows
      parameters:
        - name: active
          in: query
          schema: { type: boolean }
        - name: limit
          in: query
          schema: { type: integer, default: 25, maximum: 100 }
      responses:
        "200":
          description: All workflows with status and trigger info

    post:
      operationId: createWorkflow
      summary: Create a new integration workflow
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [org_id, title]
              properties:
                org_id:  { type: string }
                title:   { type: string, example: "Sync HubSpot to Notion" }
                active:  { type: boolean, default: false }
                steps:
                  type: array
                  items:
                    type: object
                    required: [namespace, name]
                    properties:
                      namespace: { type: string }
                      name:      { type: string }
                      params:    { type: object }
      responses:
        "200":
          description: Workflow created

  /workflows/{workflow_id}:
    get:
      operationId: getWorkflow
      summary: Get details of a specific workflow
      parameters:
        - name: workflow_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Workflow details

    put:
      operationId: updateWorkflow
      summary: Update workflow settings, steps, or toggle active state
      parameters:
        - name: workflow_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                active:  { type: boolean }
                title:   { type: string }
                steps:   { type: array, items: { type: object } }
      responses:
        "200":
          description: Workflow updated

    delete:
      operationId: deleteWorkflow
      summary: Delete a workflow permanently
      parameters:
        - name: workflow_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Workflow deleted

  /sources:
    get:
      operationId: listSources
      summary: List all event sources (triggers / webhooks / schedulers)
      parameters:
        - name: app
          in: query
          schema: { type: string, description: "Filter by app e.g. github, stripe, shopify" }
      responses:
        "200":
          description: List of active event sources with webhook URLs

    post:
      operationId: createSource
      summary: Create a new event source (trigger) for a workflow
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [component_id]
              properties:
                component_id:
                  type: string
                  description: "App component ID e.g. pd:http, pd:schedule, github-new-issue"
                  example: "pd:http"
                name:
                  type: string
                  example: "Shopify New Order Trigger"
                configured_props:
                  type: object
                  description: App-specific configuration
      responses:
        "200":
          description: Source created with webhook_url

  /sources/{source_id}:
    get:
      operationId: getSource
      summary: Get event source details and webhook URL
      parameters:
        - name: source_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Source details

    put:
      operationId: updateSource
      summary: Update source configuration or toggle active state
      parameters:
        - name: source_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                active:            { type: boolean }
                name:              { type: string }
                configured_props:  { type: object }
      responses:
        "200":
          description: Source updated

    delete:
      operationId: deleteSource
      summary: Delete an event source
      parameters:
        - name: source_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Source deleted

  /sources/{source_id}/events:
    get:
      operationId: getSourceEvents
      summary: View all events received by a source (for debugging)
      parameters:
        - name: source_id
          in: path
          required: true
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 10 }
      responses:
        "200":
          description: Recent events received by this source

  /connect/accounts:
    get:
      operationId: listConnectedAccounts
      summary: List all connected app accounts (OAuth, API key, etc.)
      parameters:
        - name: app
          in: query
          schema: { type: string, description: "Filter by app e.g. google, slack, github, hubspot" }
        - name: healthy
          in: query
          schema: { type: boolean }
      responses:
        "200":
          description: All connected accounts with health status

  /connect/accounts/{account_id}:
    get:
      operationId: getConnectedAccount
      summary: Get details of a specific connected account
      parameters:
        - name: account_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Account details with connection health

    delete:
      operationId: deleteConnectedAccount
      summary: Disconnect and remove an app account
      parameters:
        - name: account_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Account disconnected

  /connect/tokens:
    post:
      operationId: createConnectToken
      summary: Generate a short-lived token for connecting a new app account
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [external_user_id]
              properties:
                external_user_id:
                  type: string
                  description: Your user ID to associate this connection with
                  example: "user_12345"
                allowed_origins:
                  type: array
                  items: { type: string }
                  example: ["https://yourapp.com"]
                success_redirect_uri: { type: string }
                error_redirect_uri:   { type: string }
                expires_at:
                  type: string
                  format: date-time
      responses:
        "200":
          description: Connect token and URL for OAuth flow

  /v1/data/transform:
    post:
      operationId: transformData
      summary: Transform and map data between any two formats/platforms
      description: >
        Apply field mappings, data transformations, type conversions,
        and custom JS expressions to convert data from one schema to another.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [source_data, mappings]
              properties:
                source_data:
                  type: object
                  description: Input data object to transform
                mappings:
                  type: array
                  description: Array of field mapping rules
                  items: { $ref: "#/components/schemas/DataMapping" }
                output_format:
                  type: string
                  enum: [json, xml, csv, flat]
                  default: json
      responses:
        "200":
          description: Transformed data in target schema

  /v1/data/validate:
    post:
      operationId: validateDataMapping
      summary: Validate a data mapping config before running it
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [source_schema, target_schema, mappings]
              properties:
                source_schema: { type: object }
                target_schema: { type: object }
                mappings:
                  type: array
                  items: { $ref: "#/components/schemas/DataMapping" }
      responses:
        "200":
          description: Validation result with warnings and errors

  /webhooks:
    get:
      operationId: listWebhooks
      summary: List all registered webhooks
      responses:
        "200":
          description: All webhooks with delivery status

    post:
      operationId: createWebhook
      summary: Register a new webhook endpoint to receive events
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [url, events]
              properties:
                url:
                  type: string
                  format: uri
                  example: "https://yourapp.com/webhooks/receive"
                events:
                  type: array
                  items: { type: string }
                  example: [workflow.run.completed, source.event.received, error.occurred]
                secret:
                  type: string
                  description: HMAC secret for signature verification
                active:
                  type: boolean
                  default: true
      responses:
        "200":
          description: Webhook registered

  /webhooks/{webhook_id}:
    delete:
      operationId: deleteWebhook
      summary: Unregister a webhook
      parameters:
        - name: webhook_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Webhook removed

  /webhooks/{webhook_id}/deliveries:
    get:
      operationId: getWebhookDeliveries
      summary: View webhook delivery history and retry failed ones
      parameters:
        - name: webhook_id
          in: path
          required: true
          schema: { type: string }
        - name: status
          in: query
          schema: { type: string, enum: [success, failed, pending] }
      responses:
        "200":
          description: Delivery log with status codes and response bodies

  /pipelines:
    get:
      operationId: listPipelines
      summary: List all integration pipelines
      responses:
        "200":
          description: All pipelines with run stats

    post:
      operationId: createPipeline
      summary: Create a multi-step data integration pipeline
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/Pipeline" }
      responses:
        "200":
          description: Pipeline created

  /pipelines/{pipeline_id}/run:
    post:
      operationId: runPipeline
      summary: Manually trigger a pipeline run with optional input data
      parameters:
        - name: pipeline_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                input:
                  type: object
                  description: Data to inject into the first pipeline step
                dry_run:
                  type: boolean
                  description: Simulate without side effects
                  default: false
      responses:
        "200":
          description: Pipeline execution result with step-by-step output

  /pipelines/{pipeline_id}/runs:
    get:
      operationId: getPipelineRuns
      summary: Get execution history for a pipeline
      parameters:
        - name: pipeline_id
          in: path
          required: true
          schema: { type: string }
        - name: status
          in: query
          schema: { type: string, enum: [success, error, running, cancelled] }
        - name: limit
          in: query
          schema: { type: integer, default: 25 }
      responses:
        "200":
          description: Pipeline run history

  /apps:
    get:
      operationId: listApps
      summary: Browse all available app integrations (2,000+ apps)
      parameters:
        - name: q
          in: query
          schema: { type: string, description: Search apps by name, example: "shopify" }
        - name: has_components
          in: query
          schema: { type: boolean }
      responses:
        "200":
          description: App catalog with slugs for use in workflow steps

  /apps/{app_slug}/components:
    get:
      operationId: getAppComponents
      summary: Get all triggers and actions available for an app
      parameters:
        - name: app_slug
          in: path
          required: true
          schema: { type: string, example: "slack" }
        - name: type
          in: query
          schema: { type: string, enum: [source, action] }
      responses:
        "200":
          description: List of available triggers and actions for the app

  /workflows/{workflow_id}/runs:
    get:
      operationId: getWorkflowRuns
      summary: View execution logs for a workflow
      parameters:
        - name: workflow_id
          in: path
          required: true
          schema: { type: string }
        - name: status
          in: query
          schema: { type: string, enum: [success, error, running, cancelled] }
        - name: limit
          in: query
          schema: { type: integer, default: 10 }
        - name: start_timestamp
          in: query
          schema: { type: integer }
        - name: end_timestamp
          in: query
          schema: { type: integer }
      responses:
        "200":
          description: Workflow execution history with step-by-step logs

  /workflows/{workflow_id}/runs/{run_id}:
    get:
      operationId: getWorkflowRunDetail
      summary: Get detailed logs and output for a single workflow run
      parameters:
        - name: workflow_id
          in: path
          required: true
          schema: { type: string }
        - name: run_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Full step-by-step execution log with inputs, outputs, and errors

  /users/me:
    get:
      operationId: getCurrentUser
      summary: Get current authenticated user and workspace info
      responses:
        "200":
          description: User profile and org details

  /orgs/{org_id}/members:
    get:
      operationId: listOrgMembers
      summary: List all members of an organization workspace
      parameters:
        - name: org_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Org members with roles

  /orgs/{org_id}/usage:
    get:
      operationId: getUsage
      summary: Get API usage stats, compute credits, and billing info
      parameters:
        - name: org_id
          in: path
          required: true
          schema: { type: string }
        - name: period
          in: query
          schema:
            type: string
            enum: [current_month, last_month, last_7_days, last_30_days]
            default: current_month
      responses:
        "200":
          description: Usage breakdown by workflows, invocations, and compute credits`
  },
  onenote: {
    name: "OneNote Integration API",
    schema: `openapi: 3.1.0
info:
  title: OneNote Integration API
  description: >
    Full bi-directional OneNote integration via Microsoft Graph API.
    Supports notebook management, section/page sync, content parsing,
    rich HTML content creation, search, and real-time updates.
  version: 2.0.0

servers:
  - url: https://graph.microsoft.com/v1.0
    description: Microsoft Graph API v1.0 (Stable)
  - url: https://graph.microsoft.com/beta
    description: Microsoft Graph Beta (Preview features)

components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
          tokenUrl: https://login.microsoftonline.com/common/oauth2/v2.0/token
          scopes:
            Notes.Read: Read OneNote notebooks
            Notes.ReadWrite: Read and write OneNote notebooks
            Notes.Read.All: Read all notebooks in org
            Notes.ReadWrite.All: Read/write all notebooks in org
            User.Read: Read user profile
    BearerAuth:
      type: http
      scheme: bearer
      description: Microsoft Entra ID (Azure AD) Bearer Token

  schemas:
    Notebook:
      type: object
      properties:
        id:                { type: string }
        displayName:       { type: string }
        createdDateTime:   { type: string, format: date-time }
        lastModifiedDateTime: { type: string, format: date-time }
        isDefault:         { type: boolean }
        isShared:          { type: boolean }
        userRole:          { type: string, enum: [Owner, Contributor, Reader, None] }
        sectionsUrl:       { type: string }
        sectionGroupsUrl:  { type: string }

    Section:
      type: object
      properties:
        id:                   { type: string }
        displayName:          { type: string }
        createdDateTime:      { type: string, format: date-time }
        lastModifiedDateTime: { type: string, format: date-time }
        isDefault:            { type: boolean }
        pagesUrl:             { type: string }
        parentNotebook:
          type: object
          properties:
            id:          { type: string }
            displayName: { type: string }

    Page:
      type: object
      properties:
        id:                   { type: string }
        title:                { type: string }
        createdDateTime:      { type: string, format: date-time }
        lastModifiedDateTime: { type: string, format: date-time }
        contentUrl:           { type: string }
        level:                { type: integer }
        order:                { type: integer }
        userTags:
          type: array
          items: { type: string }
        parentSection:
          type: object
          properties:
            id:          { type: string }
            displayName: { type: string }
        parentNotebook:
          type: object
          properties:
            id:          { type: string }
            displayName: { type: string }

    SectionGroup:
      type: object
      properties:
        id:                   { type: string }
        displayName:          { type: string }
        createdDateTime:      { type: string, format: date-time }
        lastModifiedDateTime: { type: string, format: date-time }
        sectionsUrl:          { type: string }
        sectionGroupsUrl:     { type: string }
        parentNotebook:
          type: object
          properties:
            id:          { type: string }
            displayName: { type: string }

    PagePatch:
      type: object
      description: Patch operation to update OneNote page content
      required: [target, action]
      properties:
        target:
          type: string
          description: Target element - use 'body' for main content or CSS selector
          example: "body"
        action:
          type: string
          enum: [replace, append, prepend, insert-before, insert-after, delete]
        content:
          type: string
          description: HTML content to apply
          example: "<p>Updated content here</p>"
        position:
          type: string
          enum: [before, after]

security:
  - BearerAuth: []

paths:

  /me/onenote/notebooks:
    get:
      operationId: listNotebooks
      summary: List all OneNote notebooks for the current user
      parameters:
        - name: $orderby
          in: query
          schema: { type: string, example: "lastModifiedDateTime desc" }
        - name: $filter
          in: query
          schema: { type: string, example: "isDefault eq true" }
        - name: $select
          in: query
          schema: { type: string, example: "id,displayName,lastModifiedDateTime,isDefault" }
        - name: $expand
          in: query
          schema: { type: string, example: "sections" }
        - name: $top
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
      responses:
        "200":
          description: List of notebooks
          content:
            application/json:
              schema:
                type: object
                properties:
                  value:
                    type: array
                    items: { $ref: "#/components/schemas/Notebook" }

    post:
      operationId: createNotebook
      summary: Create a new OneNote notebook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [displayName]
              properties:
                displayName:
                  type: string
                  example: "My Project Notes"
      responses:
        "201":
          description: Notebook created

  /me/onenote/notebooks/{notebook_id}:
    get:
      operationId: getNotebook
      summary: Get a specific notebook by ID
      parameters:
        - name: notebook_id
          in: path
          required: true
          schema: { type: string }
        - name: $expand
          in: query
          schema: { type: string, example: "sections,sectionGroups" }
      responses:
        "200":
          description: Notebook details

  /me/onenote/notebooks/{notebook_id}/sections:
    get:
      operationId: listNotebookSections
      summary: List all sections inside a notebook
      parameters:
        - name: notebook_id
          in: path
          required: true
          schema: { type: string }
        - name: $orderby
          in: query
          schema: { type: string, example: "displayName asc" }
      responses:
        "200":
          description: Sections list

    post:
      operationId: createSection
      summary: Create a new section in a notebook
      parameters:
        - name: notebook_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [displayName]
              properties:
                displayName:
                  type: string
                  example: "Meeting Notes"
      responses:
        "201":
          description: Section created

  /me/onenote/sections:
    get:
      operationId: listAllSections
      summary: List ALL sections across all notebooks
      parameters:
        - name: $orderby
          in: query
          schema: { type: string, example: "lastModifiedDateTime desc" }
        - name: $filter
          in: query
          schema: { type: string, example: "parentNotebook/displayName eq 'Work'" }
        - name: $expand
          in: query
          schema: { type: string, example: "parentNotebook" }
        - name: $top
          in: query
          schema: { type: integer, default: 20 }
      responses:
        "200":
          description: All sections across all notebooks

  /me/onenote/sections/{section_id}:
    get:
      operationId: getSection
      summary: Get a specific section by ID
      parameters:
        - name: section_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Section details

  /me/onenote/sections/{section_id}/pages:
    get:
      operationId: listSectionPages
      summary: List all pages in a section (with sync metadata)
      parameters:
        - name: section_id
          in: path
          required: true
          schema: { type: string }
        - name: $orderby
          in: query
          schema: { type: string, example: "lastModifiedDateTime desc" }
        - name: $filter
          in: query
          schema: { type: string, example: "lastModifiedDateTime ge 2024-01-01T00:00:00Z" }
        - name: $select
          in: query
          schema: { type: string, example: "id,title,lastModifiedDateTime,contentUrl" }
        - name: $top
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: $skip
          in: query
          schema: { type: integer, default: 0 }
      responses:
        "200":
          description: Pages in section with sync-relevant metadata

    post:
      operationId: createPage
      summary: Create a new page in a section with rich HTML content
      parameters:
        - name: section_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          text/html:
            schema:
              type: string
              description: Full HTML page using OneNote HTML schema
              example: "<!DOCTYPE html><html><head><title>My Page</title></head><body><h1>Hello</h1></body></html>"
      responses:
        "201":
          description: Page created successfully

  /me/onenote/pages:
    get:
      operationId: listAllPages
      summary: List ALL pages across all notebooks (great for full sync)
      parameters:
        - name: $orderby
          in: query
          schema: { type: string, example: "lastModifiedDateTime desc" }
        - name: $filter
          in: query
          schema: { type: string, example: "lastModifiedDateTime ge 2024-06-01T00:00:00Z" }
        - name: $select
          in: query
          schema: { type: string, example: "id,title,lastModifiedDateTime,parentSection,parentNotebook" }
        - name: $expand
          in: query
          schema: { type: string, example: "parentSection,parentNotebook" }
        - name: $top
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: $skip
          in: query
          schema: { type: integer, default: 0 }
      responses:
        "200":
          description: All pages with full sync metadata

  /me/onenote/pages/{page_id}:
    get:
      operationId: getPage
      summary: Get page metadata (title, dates, location)
      parameters:
        - name: page_id
          in: path
          required: true
          schema: { type: string }
        - name: $expand
          in: query
          schema: { type: string, example: "parentSection,parentNotebook" }
      responses:
        "200":
          description: Page metadata

    patch:
      operationId: updatePageContent
      summary: Update page content - append, replace, or insert HTML elements
      parameters:
        - name: page_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items: { $ref: "#/components/schemas/PagePatch" }
              example:
                - target: "body"
                  action: "append"
                  content: "<p><b>Updated:</b> New paragraph appended to page.</p>"
                - target: "title"
                  action: "replace"
                  content: "<p>New Page Title</p>"
      responses:
        "204":
          description: Page updated successfully

    delete:
      operationId: deletePage
      summary: Delete a OneNote page permanently
      parameters:
        - name: page_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Page deleted

  /me/onenote/pages/{page_id}/content:
    get:
      operationId: getPageContent
      summary: Get full HTML content of a page (for parsing and syncing)
      parameters:
        - name: page_id
          in: path
          required: true
          schema: { type: string }
        - name: includeIDs
          in: query
          schema: { type: boolean, default: true }
        - name: preAuthenticated
          in: query
          schema: { type: boolean, default: false }
      responses:
        "200":
          description: Full page HTML content
          content:
            text/html:
              schema:
                type: string

  /me/onenote/pages/{page_id}/copyToSection:
    post:
      operationId: copyPageToSection
      summary: Copy a page to a different section (supports cross-notebook sync)
      parameters:
        - name: page_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [id]
              properties:
                id:
                  type: string
                  description: Target section ID to copy page into
                groupId:
                  type: string
                  description: Microsoft 365 Group ID for shared notebooks
                siteId:
                  type: string
                  description: SharePoint site ID
      responses:
        "202":
          description: Copy operation initiated (async)

  /me/onenote/sectionGroups:
    get:
      operationId: listSectionGroups
      summary: List all section groups (folders that contain sections)
      parameters:
        - name: $expand
          in: query
          schema: { type: string, example: "sections,parentNotebook" }
        - name: $orderby
          in: query
          schema: { type: string, example: "displayName asc" }
      responses:
        "200":
          description: All section groups

  /me/onenote/notebooks/{notebook_id}/sectionGroups:
    post:
      operationId: createSectionGroup
      summary: Create a section group (subfolder) inside a notebook
      parameters:
        - name: notebook_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [displayName]
              properties:
                displayName:
                  type: string
                  example: "Q1 2025 Projects"
      responses:
        "201":
          description: Section group created

  /groups/{group_id}/onenote/notebooks:
    get:
      operationId: listGroupNotebooks
      summary: List notebooks in a Microsoft 365 Group (Teams channel notes)
      parameters:
        - name: group_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Group/Team notebooks

    post:
      operationId: createGroupNotebook
      summary: Create a notebook in a Microsoft 365 Group
      parameters:
        - name: group_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [displayName]
              properties:
                displayName: { type: string }
      responses:
        "201":
          description: Group notebook created

  /groups/{group_id}/onenote/sections/{section_id}/pages:
    post:
      operationId: createGroupPage
      summary: Create a page in a shared Microsoft 365 Group notebook
      parameters:
        - name: group_id
          in: path
          required: true
          schema: { type: string }
        - name: section_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          text/html:
            schema:
              type: string
              description: Full HTML page content
      responses:
        "201":
          description: Page created in shared notebook

  /me/onenote/operations/{operation_id}:
    get:
      operationId: getOperationStatus
      summary: Check status of async operations (copy, move)
      parameters:
        - name: operation_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Operation status
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:           { type: string }
                  status:
                    type: string
                    enum: [notStarted, running, completed, failed]
                  createdDateTime:    { type: string }
                  lastActionDateTime: { type: string }
                  resourceId:         { type: string }
                  resourceLocation:   { type: string }
                  percentComplete:    { type: string }
                  error:
                    type: object
                    properties:
                      code:    { type: string }
                      message: { type: string }

  /me/onenote/pages/delta:
    get:
      operationId: getDeltaPages
      summary: Incremental page sync - get only new/changed pages since last sync
      parameters:
        - name: $deltaToken
          in: query
          schema:
            type: string
            description: Token from previous delta response to get only new changes
        - name: $select
          in: query
          schema: { type: string, example: "id,title,lastModifiedDateTime,parentSection" }
      responses:
        "200":
          description: Changed pages since last delta call
          content:
            application/json:
              schema:
                type: object
                properties:
                  value:
                    type: array
                    items: { $ref: "#/components/schemas/Page" }
                  "@odata.deltaLink":
                    type: string
                    description: Save this token for next incremental sync call
                  "@odata.nextLink":
                    type: string
                    description: Pagination link if more results exist`
  },
  teams: {
    name: "Microsoft Teams Integration API",
    schema: `openapi: 3.1.0
info:
  title: Microsoft Teams Integration API
  description: >
    Full Microsoft Teams integration via Microsoft Graph API.
    Covers teams, channels, messages, chats, notifications,
    meetings, members, tabs, files, and real-time webhooks.
  version: 2.0.0

servers:
  - url: https://graph.microsoft.com/v1.0
    description: Microsoft Graph API v1.0 (Stable)
  - url: https://graph.microsoft.com/beta
    description: Microsoft Graph Beta (Advanced Teams features)

components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
          tokenUrl: https://login.microsoftonline.com/common/oauth2/v2.0/token
          scopes:
            Team.ReadBasic.All: Read basic team info
            Channel.ReadBasic.All: Read channel info
            ChannelMessage.Read.All: Read channel messages
            ChannelMessage.Send: Send channel messages
            Chat.Read: Read chat messages
            Chat.ReadWrite: Read and send chat messages
            ChatMessage.Send: Send chat messages
            User.Read: Read user profile
            OnlineMeetings.ReadWrite: Create and manage meetings
            Files.ReadWrite.All: Access Teams files
    BearerAuth:
      type: http
      scheme: bearer
      description: Azure AD Bearer Token from app registration

  schemas:
    Team:
      type: object
      properties:
        id:            { type: string }
        displayName:   { type: string }
        description:   { type: string }
        isArchived:    { type: boolean }
        visibility:    { type: string, enum: [private, public] }
        webUrl:        { type: string }
        createdDateTime: { type: string, format: date-time }

    Channel:
      type: object
      properties:
        id:            { type: string }
        displayName:   { type: string }
        description:   { type: string }
        email:         { type: string }
        webUrl:        { type: string }
        membershipType:
          type: string
          enum: [standard, private, shared]
        createdDateTime: { type: string, format: date-time }
        isArchived:    { type: boolean }

    Message:
      type: object
      properties:
        id:            { type: string }
        replyToId:     { type: string }
        messageType:   { type: string }
        createdDateTime: { type: string, format: date-time }
        lastModifiedDateTime: { type: string, format: date-time }
        subject:       { type: string }
        importance:    { type: string, enum: [normal, high, urgent] }
        webUrl:        { type: string }
        from:
          type: object
          properties:
            user:
              type: object
              properties:
                id:          { type: string }
                displayName: { type: string }
        body:
          type: object
          properties:
            contentType: { type: string, enum: [text, html] }
            content:     { type: string }
        attachments:
          type: array
          items:
            type: object
            properties:
              id:          { type: string }
              contentType: { type: string }
              contentUrl:  { type: string }
              name:        { type: string }
        mentions:
          type: array
          items:
            type: object
            properties:
              id:          { type: integer }
              mentionText: { type: string }
        reactions:
          type: array
          items:
            type: object
            properties:
              reactionType: { type: string }
              createdDateTime: { type: string }

    Chat:
      type: object
      properties:
        id:            { type: string }
        topic:         { type: string }
        chatType:      { type: string, enum: [oneOnOne, group, meeting] }
        createdDateTime: { type: string, format: date-time }
        lastUpdatedDateTime: { type: string, format: date-time }
        webUrl:        { type: string }

    Member:
      type: object
      properties:
        id:          { type: string }
        displayName: { type: string }
        email:       { type: string }
        roles:
          type: array
          items: { type: string, enum: [owner, member, guest] }
        userId:      { type: string }

    Meeting:
      type: object
      properties:
        id:            { type: string }
        joinWebUrl:    { type: string }
        subject:       { type: string }
        startDateTime: { type: string, format: date-time }
        endDateTime:   { type: string, format: date-time }

    Subscription:
      type: object
      description: Change notification subscription for real-time updates
      properties:
        id:                  { type: string }
        resource:            { type: string }
        changeType:          { type: string }
        clientState:         { type: string }
        notificationUrl:     { type: string }
        expirationDateTime:  { type: string, format: date-time }

security:
  - BearerAuth: []

paths:

  /me/joinedTeams:
    get:
      operationId: listMyTeams
      summary: List all Teams the current user is a member of
      parameters:
        - name: $select
          in: query
          schema: { type: string, example: "id,displayName,description,visibility" }
        - name: $expand
          in: query
          schema: { type: string, example: "channels" }
      responses:
        "200":
          description: All joined teams

  /teams:
    post:
      operationId: createTeam
      summary: Create a brand new Microsoft Team
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [displayName, description, visibility]
              properties:
                displayName:
                  type: string
                  example: "Marketing Q1 2025"
                description:
                  type: string
                  example: "Team for Q1 marketing campaigns"
                visibility:
                  type: string
                  enum: [private, public]
                  default: private
      responses:
        "202":
          description: Team creation initiated (async)

  /teams/{team_id}:
    get:
      operationId: getTeam
      summary: Get full details of a specific Team
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: $expand
          in: query
          schema: { type: string, example: "channels,members,installedApps" }
      responses:
        "200":
          description: Team details

    patch:
      operationId: updateTeam
      summary: Update team settings, description, or permissions
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                displayName: { type: string }
                description: { type: string }
                visibility:  { type: string, enum: [private, public] }
      responses:
        "204":
          description: Team updated

    delete:
      operationId: deleteTeam
      summary: Delete a Team
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Team deleted

  /teams/{team_id}/archive:
    post:
      operationId: archiveTeam
      summary: Archive a team (read-only, preserved)
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "202":
          description: Archive initiated

  /teams/{team_id}/unarchive:
    post:
      operationId: unarchiveTeam
      summary: Restore an archived team to active
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "202":
          description: Unarchive initiated

  /teams/{team_id}/channels:
    get:
      operationId: listChannels
      summary: List all channels in a Team
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: $filter
          in: query
          schema: { type: string, example: "membershipType eq 'standard'" }
        - name: $select
          in: query
          schema: { type: string, example: "id,displayName,description,membershipType,webUrl" }
      responses:
        "200":
          description: Channel list

    post:
      operationId: createChannel
      summary: Create a new channel in a Team
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [displayName, membershipType]
              properties:
                displayName:
                  type: string
                  example: "announcements-q1"
                description:
                  type: string
                  example: "Q1 2025 announcements and updates"
                membershipType:
                  type: string
                  enum: [standard, private, shared]
                  default: standard
      responses:
        "201":
          description: Channel created

  /teams/{team_id}/channels/{channel_id}:
    get:
      operationId: getChannel
      summary: Get details of a specific channel
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Channel details

    patch:
      operationId: updateChannel
      summary: Update channel display name or description
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                displayName: { type: string }
                description: { type: string }
      responses:
        "204":
          description: Channel updated

    delete:
      operationId: deleteChannel
      summary: Delete a channel from a Team
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Channel deleted

  /teams/{team_id}/channels/{channel_id}/messages:
    get:
      operationId: listChannelMessages
      summary: List all messages in a channel (top-level threads)
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
        - name: $top
          in: query
          schema: { type: integer, default: 20, maximum: 50 }
        - name: $filter
          in: query
          schema: { type: string, example: "lastModifiedDateTime gt 2025-01-01T00:00:00Z" }
      responses:
        "200":
          description: Channel messages (thread starters)

    post:
      operationId: sendChannelMessage
      summary: Send a message to a Teams channel
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [body]
              properties:
                subject:
                  type: string
                  example: "Weekly Update"
                importance:
                  type: string
                  enum: [normal, high, urgent]
                  default: normal
                body:
                  type: object
                  required: [content]
                  properties:
                    contentType: { type: string, enum: [text, html], default: html }
                    content:     { type: string, example: "<h2>Team Update</h2><p>This week's summary...</p>" }
                mentions:
                  type: array
                  items: { type: object }
                attachments:
                  type: array
                  items: { type: object }
      responses:
        "201":
          description: Message sent

  /teams/{team_id}/channels/{channel_id}/messages/{message_id}:
    get:
      operationId: getChannelMessage
      summary: Get a specific channel message by ID
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
        - name: message_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Message details with reactions and attachments

    patch:
      operationId: updateChannelMessage
      summary: Update/edit an existing channel message
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
        - name: message_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                body:
                  type: object
                  properties:
                    contentType: { type: string, enum: [text, html] }
                    content:     { type: string }
      responses:
        "204":
          description: Message updated

  /teams/{team_id}/channels/{channel_id}/messages/{message_id}/replies:
    get:
      operationId: listMessageReplies
      summary: Get all replies in a message thread
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
        - name: message_id
          in: path
          required: true
          schema: { type: string }
        - name: $top
          in: query
          schema: { type: integer, default: 20 }
      responses:
        "200":
          description: Thread replies

    post:
      operationId: replyToMessage
      summary: Reply to a message thread in a channel
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
        - name: message_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [body]
              properties:
                body:
                  type: object
                  properties:
                    contentType: { type: string, enum: [text, html], default: html }
                    content:     { type: string, example: "<p>Thanks for the update!</p>" }
                importance: { type: string, enum: [normal, high, urgent] }
      responses:
        "201":
          description: Reply sent

  /teams/{team_id}/channels/{channel_id}/messages/delta:
    get:
      operationId: getDeltaMessages
      summary: Incremental message sync - get only new/changed messages
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
        - name: $deltaToken
          in: query
          schema: { type: string, description: Save and reuse this token for incremental syncs }
      responses:
        "200":
          description: Changed messages since last delta call
          content:
            application/json:
              schema:
                type: object
                properties:
                  value:
                    type: array
                    items: { $ref: "#/components/schemas/Message" }
                  "@odata.deltaLink": { type: string }
                  "@odata.nextLink":  { type: string }

  /me/chats:
    get:
      operationId: listMyChats
      summary: List all 1:1 and group chats for current user
      parameters:
        - name: $expand
          in: query
          schema: { type: string, example: "members,lastMessagePreview" }
        - name: $filter
          in: query
          schema: { type: string, example: "chatType eq 'oneOnOne'" }
        - name: $orderby
          in: query
          schema: { type: string, example: "lastUpdatedDateTime desc" }
        - name: $top
          in: query
          schema: { type: integer, default: 20 }
      responses:
        "200":
          description: All chats

  /chats:
    post:
      operationId: createChat
      summary: Create a new 1:1 or group chat
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [chatType, members]
              properties:
                chatType: { type: string, enum: [oneOnOne, group] }
                topic:    { type: string, example: "Sprint Planning Discussion" }
                members:
                  type: array
                  items: { type: object }
      responses:
        "201":
          description: Chat created

  /chats/{chat_id}/messages:
    get:
      operationId: listChatMessages
      summary: List messages in a 1:1 or group chat
      parameters:
        - name: chat_id
          in: path
          required: true
          schema: { type: string }
        - name: $top
          in: query
          schema: { type: integer, default: 20, maximum: 50 }
        - name: $filter
          in: query
          schema: { type: string, example: "createdDateTime gt 2025-01-01T00:00:00Z" }
      responses:
        "200":
          description: Chat messages

    post:
      operationId: sendChatMessage
      summary: Send a message to a 1:1 or group chat
      parameters:
        - name: chat_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [body]
              properties:
                body:
                  type: object
                  required: [content]
                  properties:
                    contentType: { type: string, enum: [text, html], default: html }
                    content:     { type: string, example: "<p>Hey! Can we sync at 3pm?</p>" }
                importance: { type: string, enum: [normal, high, urgent] }
      responses:
        "201":
          description: Chat message sent

  /teams/{team_id}/members:
    get:
      operationId: listTeamMembers
      summary: List all members of a Team
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: $filter
          in: query
          schema: { type: string, example: "roles/any(r: r eq 'owner')" }
      responses:
        "200":
          description: Team members with roles

    post:
      operationId: addTeamMember
      summary: Add a user to a Team
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [roles]
              properties:
                roles:
                  type: array
                  items: { type: string, enum: [owner, member, guest] }
                  example: [member]
      responses:
        "201":
          description: Member added

  /teams/{team_id}/members/{membership_id}:
    patch:
      operationId: updateTeamMember
      summary: Update a member's role (promote to owner, demote to member)
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: membership_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                roles:
                  type: array
                  items: { type: string, enum: [owner, member] }
      responses:
        "200":
          description: Member role updated

    delete:
      operationId: removeTeamMember
      summary: Remove a member from a Team
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: membership_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Member removed

  /teams/{team_id}/sendActivityNotification:
    post:
      operationId: sendTeamActivityNotification
      summary: Send a custom activity notification to a user via Teams
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [topic, activityType, previewText, recipient]
              properties:
                topic:
                  type: object
                  properties:
                    source:   { type: string, enum: [entityUrl, text] }
                    value:    { type: string }
                activityType:
                  type: string
                  example: "taskAssigned"
                previewText:
                  type: object
                  properties:
                    content: { type: string, example: "You have been assigned a new task" }
                recipient:
                  type: object
                  properties:
                    userId: { type: string }
                templateParameters:
                  type: array
                  items:
                    type: object
                    properties:
                      name:  { type: string }
                      value: { type: string }
      responses:
        "204":
          description: Notification sent

  /chats/{chat_id}/sendActivityNotification:
    post:
      operationId: sendChatActivityNotification
      summary: Send an activity notification targeted to a chat
      parameters:
        - name: chat_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [topic, activityType, previewText, recipient]
              properties:
                topic:
                  type: object
                  properties:
                    source: { type: string, enum: [entityUrl, text] }
                    value:  { type: string }
                activityType:
                  type: string
                  example: "approvalRequired"
                previewText:
                  type: object
                  properties:
                    content: { type: string, example: "Your approval is needed on budget request." }
                recipient:
                  type: object
                  properties:
                    userId: { type: string }
      responses:
        "204":
          description: Notification sent

  /subscriptions:
    get:
      operationId: listSubscriptions
      summary: List all active real-time notification subscriptions
      responses:
        "200":
          description: All subscriptions

    post:
      operationId: createSubscription
      summary: Subscribe to real-time Teams events via webhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [changeType, notificationUrl, resource, expirationDateTime, clientState]
              properties:
                changeType:
                  type: string
                  example: "created,updated,deleted"
                notificationUrl:
                  type: string
                  format: uri
                  example: "https://yourapp.com/webhooks/teams"
                resource:
                  type: string
                  description: Resource path to subscribe to
                  example: "/teams/team-id/channels/channel-id/messages"
                expirationDateTime:
                  type: string
                  format: date-time
                  example: "2025-04-01T00:00:00Z"
                clientState:
                  type: string
                  description: Secret token to validate incoming webhook payloads
                  example: "my-secret-validation-token"
      responses:
        "201":
          description: Subscription created

  /subscriptions/{subscription_id}:
    patch:
      operationId: renewSubscription
      summary: Renew a subscription before it expires
      parameters:
        - name: subscription_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [expirationDateTime]
              properties:
                expirationDateTime: { type: string, format: date-time }
      responses:
        "200":
          description: Subscription renewed

    delete:
      operationId: deleteSubscription
      summary: Remove a webhook subscription
      parameters:
        - name: subscription_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Subscription deleted

  /me/onlineMeetings:
    post:
      operationId: createMeeting
      summary: Create a Teams online meeting with join link
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [startDateTime, endDateTime, subject]
              properties:
                subject:       { type: string, example: "Q1 Planning Session" }
                startDateTime: { type: string, format: date-time, example: "2025-03-01T09:00:00Z" }
                endDateTime:   { type: string, format: date-time, example: "2025-03-01T10:00:00Z" }
                allowAttendeeToEnableCamera: { type: boolean, default: true }
                allowAttendeeToEnableMic:    { type: boolean, default: true }
                recordAutomatically:         { type: boolean, default: false }
      responses:
        "201":
          description: Meeting created with join URL

  /me/onlineMeetings/{meeting_id}:
    get:
      operationId: getMeeting
      summary: Get details of a Teams meeting including join URL
      parameters:
        - name: meeting_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Meeting details with joinWebUrl

    delete:
      operationId: deleteMeeting
      summary: Cancel a Teams meeting
      parameters:
        - name: meeting_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Meeting cancelled

  /teams/{team_id}/channels/{channel_id}/tabs:
    get:
      operationId: listChannelTabs
      summary: List all tabs pinned in a channel
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
        - name: $expand
          in: query
          schema: { type: string, example: "teamsApp" }
      responses:
        "200":
          description: Channel tabs list

    post:
      operationId: addChannelTab
      summary: Add a tab to a Teams channel
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [displayName, configuration]
              properties:
                displayName: { type: string, example: "Project Dashboard" }
                configuration:
                  type: object
                  properties:
                    contentUrl: { type: string, example: "https://yourapp.com/dashboard" }
                    websiteUrl: { type: string }
      responses:
        "201":
          description: Tab added to channel

  /users/{user_id}/presence:
    get:
      operationId: getUserPresence
      summary: Get a user's Teams presence (Available, Busy, Away, etc.)
      parameters:
        - name: user_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: User presence status
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:           { type: string }
                  availability:
                    type: string
                    enum: [Available, AvailableIdle, Away, BeRightBack, Busy,
                           BusyIdle, DoNotDisturb, Offline, PresenceUnknown]
                  activity:
                    type: string
                    enum: [Available, Away, BeRightBack, Busy, DoNotDisturb,
                           InACall, InAMeeting, Offline, OffWork, OutOfOffice, Presenting]

  /communications/getPresencesByUserId:
    post:
      operationId: getBulkPresence
      summary: Get presence for multiple users at once (bulk)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [ids]
              properties:
                ids:
                  type: array
                  description: Up to 650 user IDs per call
                  items: { type: string }
                  example: ["user-id-1", "user-id-2", "user-id-3"]
      responses:
        "200":
          description: Presence status for all requested users

  /teams/{team_id}/channels/{channel_id}/filesFolder:
    get:
      operationId: getChannelFilesFolder
      summary: Get the SharePoint folder backing a Teams channel's Files tab
      parameters:
        - name: team_id
          in: path
          required: true
          schema: { type: string }
        - name: channel_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: DriveItem folder with download and upload URLs`
  },
  project: {
    name: "Microsoft Project Integration API",
    schema: `openapi: 3.1.0
info:
  title: Microsoft Project Integration API
  description: >
    Full bi-directional Microsoft Project integration via Microsoft Graph API
    and Project Online REST API. Covers projects, tasks, resources, assignments,
    timesheets, risks, issues, OAuth setup, and real-time sync.
  version: 2.0.0

servers:
  - url: https://graph.microsoft.com/v1.0
    description: Microsoft Graph API (Project for the Web)
  - url: https://{tenant}.sharepoint.com/_api/ProjectServer
    description: Project Online REST API (Project Online / On-Prem)
    variables:
      tenant:
        default: yourcompany
        description: Your SharePoint/Project Online tenant name

components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
          tokenUrl: https://login.microsoftonline.com/common/oauth2/v2.0/token
          scopes:
            Tasks.ReadWrite: Read and write tasks
            Tasks.Read: Read tasks
            User.Read: Read user profile
            Group.ReadWrite.All: Manage project groups
            Sites.ReadWrite.All: Access SharePoint/Project sites
    BearerAuth:
      type: http
      scheme: bearer
      description: Azure AD Bearer Token

  schemas:
    Project:
      type: object
      properties:
        id:                    { type: string }
        displayName:           { type: string }
        description:           { type: string }
        createdDateTime:       { type: string, format: date-time }
        lastModifiedDateTime:  { type: string, format: date-time }
        owner:
          type: object
          properties:
            id:          { type: string }
            displayName: { type: string }
        percentComplete:       { type: integer, minimum: 0, maximum: 100 }
        startDateTime:         { type: string, format: date-time }
        finishDateTime:        { type: string, format: date-time }

    Task:
      type: object
      properties:
        id:                    { type: string }
        displayName:           { type: string }
        notes:                 { type: string }
        startDateTime:         { type: string, format: date-time }
        dueDateTime:           { type: string, format: date-time }
        completedDateTime:     { type: string, format: date-time }
        percentComplete:       { type: integer, minimum: 0, maximum: 100 }
        priority:              { type: integer, minimum: 0, maximum: 10 }
        duration:              { type: string, description: "ISO 8601 duration e.g. PT8H" }
        isCompleted:           { type: boolean }
        parentId:              { type: string, description: Parent task ID for subtasks }
        bucketId:              { type: string }
        createdDateTime:       { type: string, format: date-time }
        assignments:
          type: object
          additionalProperties:
            type: object
            properties:
              assignedDateTime:  { type: string }
              orderHint:         { type: string }
              assignedBy:
                type: object
                properties:
                  user:
                    type: object
                    properties:
                      id:          { type: string }
                      displayName: { type: string }
        appliedCategories:
          type: object
          additionalProperties: { type: boolean }
        checklist:
          type: object
          additionalProperties:
            type: object
            properties:
              displayName:   { type: string }
              isChecked:     { type: boolean }
              lastModifiedDateTime: { type: string }

    Resource:
      type: object
      properties:
        id:                    { type: string }
        displayName:           { type: string }
        email:                 { type: string }
        maxUnits:              { type: number, description: "Max allocation e.g. 1.0 = 100%" }
        standardRate:          { type: number, description: Hourly rate in currency }
        overtimeRate:          { type: number }
        resourceType:
          type: string
          enum: [Work, Material, Cost, Budget]
        isGeneric:             { type: boolean }
        isActive:              { type: boolean }

    Assignment:
      type: object
      properties:
        id:                    { type: string }
        taskId:                { type: string }
        resourceId:            { type: string }
        units:                 { type: number, description: "Allocation e.g. 0.5 = 50%" }
        work:                  { type: string, description: Total work duration }
        actualWork:            { type: string }
        remainingWork:         { type: string }
        startDate:             { type: string, format: date }
        finishDate:            { type: string, format: date }
        percentWorkComplete:   { type: integer }
        cost:                  { type: number }
        actualCost:            { type: number }

    Bucket:
      type: object
      description: Task grouping bucket (column/phase in project board)
      properties:
        id:          { type: string }
        name:        { type: string }
        planId:      { type: string }
        orderHint:   { type: string }

    Risk:
      type: object
      properties:
        id:                    { type: string }
        title:                 { type: string }
        description:           { type: string }
        probability:
          type: string
          enum: [low, medium, high]
        impact:
          type: string
          enum: [low, medium, high]
        status:
          type: string
          enum: [active, closed, resolved]
        owner:
          type: object
          properties:
            id:          { type: string }
            displayName: { type: string }
        dueDate:               { type: string, format: date }
        mitigationPlan:        { type: string }
        contingencyPlan:       { type: string }

    Timesheet:
      type: object
      properties:
        id:                    { type: string }
        periodId:              { type: string }
        name:                  { type: string }
        status:
          type: string
          enum: [InProgress, Submitted, Approved, Rejected]
        startDate:             { type: string, format: date }
        endDate:               { type: string, format: date }
        comment:               { type: string }
        lines:
          type: array
          items:
            type: object
            properties:
              taskId:          { type: string }
              taskName:        { type: string }
              projectId:       { type: string }
              projectName:     { type: string }
              actualWork:      { type: number }
              plannedWork:     { type: number }

security:
  - BearerAuth: []

paths:

  /planner/plans:
    get:
      operationId: listProjects
      summary: List all project plans
      parameters:
        - name: $orderby
          in: query
          schema: { type: string, example: "createdDateTime desc" }
        - name: $select
          in: query
          schema: { type: string, example: "id,title,createdDateTime,owner" }
      responses:
        "200":
          description: All project plans
          content:
            application/json:
              schema:
                type: object
                properties:
                  value:
                    type: array
                    items: { $ref: "#/components/schemas/Project" }

    post:
      operationId: createProject
      summary: Create a new project plan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, owner]
              properties:
                title:
                  type: string
                  example: "Website Redesign 2025"
                owner:
                  type: string
                  description: Microsoft 365 Group ID that owns this plan
                  example: "group-id-here"
                description:
                  type: string
                  example: "Complete overhaul of company website"
      responses:
        "201":
          description: Project created

  /planner/plans/{plan_id}:
    get:
      operationId: getProject
      summary: Get full project details
      parameters:
        - name: plan_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Project details

    patch:
      operationId: updateProject
      summary: Update project title, description or settings
      parameters:
        - name: plan_id
          in: path
          required: true
          schema: { type: string }
        - name: If-Match
          in: header
          required: true
          schema: { type: string, description: ETag value from GET response }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:       { type: string }
                description: { type: string }
      responses:
        "204":
          description: Project updated

    delete:
      operationId: deleteProject
      summary: Delete a project plan
      parameters:
        - name: plan_id
          in: path
          required: true
          schema: { type: string }
        - name: If-Match
          in: header
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Project deleted

  /planner/plans/{plan_id}/details:
    get:
      operationId: getProjectDetails
      summary: Get extended project details including shared notes and category labels
      parameters:
        - name: plan_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Project details with category names and shared notes

  /planner/plans/{plan_id}/tasks:
    get:
      operationId: listProjectTasks
      summary: List all tasks in a project (full sync)
      parameters:
        - name: plan_id
          in: path
          required: true
          schema: { type: string }
        - name: $orderby
          in: query
          schema: { type: string, example: "dueDateTime asc" }
        - name: $filter
          in: query
          schema:
            type: string
            description: Filter tasks for incremental sync
            example: "percentComplete ne 100"
        - name: $select
          in: query
          schema:
            type: string
            example: "id,title,dueDateTime,percentComplete,assignments,bucketId"
      responses:
        "200":
          description: All tasks with full assignment and status data
          content:
            application/json:
              schema:
                type: object
                properties:
                  value:
                    type: array
                    items: { $ref: "#/components/schemas/Task" }

  /planner/tasks:
    post:
      operationId: createTask
      summary: Create a new task in a project
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [planId, title]
              properties:
                planId:
                  type: string
                  description: Project plan ID
                bucketId:
                  type: string
                  description: Bucket/column to place the task in
                title:
                  type: string
                  example: "Design homepage wireframes"
                startDateTime:
                  type: string
                  format: date-time
                dueDateTime:
                  type: string
                  format: date-time
                  example: "2025-03-15T17:00:00Z"
                percentComplete:
                  type: integer
                  default: 0
                priority:
                  type: integer
                  minimum: 0
                  maximum: 10
                  description: "0=urgent, 1=important, 5=medium, 9=low"
                assignments:
                  type: object
                  description: Key=userId, Value=assignment object
                  additionalProperties:
                    type: object
                    properties:
                      "@odata.type":
                        type: string
                        default: "#microsoft.graph.plannerAssignment"
                      orderHint:
                        type: string
                        default: " !"
                appliedCategories:
                  type: object
                  description: "category1 through category6 flags"
                  additionalProperties: { type: boolean }
      responses:
        "201":
          description: Task created

  /planner/tasks/{task_id}:
    get:
      operationId: getTask
      summary: Get a specific task by ID
      parameters:
        - name: task_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Task details

    patch:
      operationId: updateTask
      summary: Update task progress, dates, assignees, priority
      parameters:
        - name: task_id
          in: path
          required: true
          schema: { type: string }
        - name: If-Match
          in: header
          required: true
          schema: { type: string, description: ETag from GET response for optimistic concurrency }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:             { type: string }
                percentComplete:   { type: integer, minimum: 0, maximum: 100 }
                startDateTime:     { type: string, format: date-time }
                dueDateTime:       { type: string, format: date-time }
                priority:          { type: integer }
                bucketId:          { type: string }
                assignments:       { type: object }
                appliedCategories: { type: object }
      responses:
        "204":
          description: Task updated

    delete:
      operationId: deleteTask
      summary: Delete a task from a project
      parameters:
        - name: task_id
          in: path
          required: true
          schema: { type: string }
        - name: If-Match
          in: header
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Task deleted

  /planner/tasks/{task_id}/details:
    get:
      operationId: getTaskDetails
      summary: Get task checklist, description, references, and notes
      parameters:
        - name: task_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Full task details with checklist items and notes

    patch:
      operationId: updateTaskDetails
      summary: Update task description, checklist items, and external references
      parameters:
        - name: task_id
          in: path
          required: true
          schema: { type: string }
        - name: If-Match
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                description:
                  type: string
                  example: "Create low-fidelity wireframes for all 5 key pages"
                checklist:
                  type: object
                  description: "Key=unique ID, Value=checklist item"
                  additionalProperties:
                    type: object
                    properties:
                      "@odata.type":
                        type: string
                        default: "#microsoft.graph.plannerChecklistItem"
                      title:      { type: string }
                      isChecked:  { type: boolean }
                references:
                  type: object
                  description: Attach URLs or file references
                  additionalProperties:
                    type: object
                    properties:
                      "@odata.type":
                        type: string
                        default: "#microsoft.graph.plannerExternalReference"
                      alias:    { type: string }
                      type:     { type: string, enum: [PowerPoint, Word, Excel, Other] }
                      previewPriority: { type: string }
      responses:
        "204":
          description: Task details updated

  /planner/plans/{plan_id}/buckets:
    get:
      operationId: listBuckets
      summary: List all buckets (phases/columns) in a project
      parameters:
        - name: plan_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Project buckets

  /planner/buckets:
    post:
      operationId: createBucket
      summary: Create a new bucket (phase/column) in a project
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, planId, orderHint]
              properties:
                name:
                  type: string
                  example: "Design Phase"
                planId:    { type: string }
                orderHint: { type: string, default: " !" }
      responses:
        "201":
          description: Bucket created

  /planner/buckets/{bucket_id}:
    patch:
      operationId: updateBucket
      summary: Rename a bucket or reorder it
      parameters:
        - name: bucket_id
          in: path
          required: true
          schema: { type: string }
        - name: If-Match
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:      { type: string }
                orderHint: { type: string }
      responses:
        "204":
          description: Bucket updated

    delete:
      operationId: deleteBucket
      summary: Delete a project bucket/phase
      parameters:
        - name: bucket_id
          in: path
          required: true
          schema: { type: string }
        - name: If-Match
          in: header
          required: true
          schema: { type: string }
      responses:
        "204":
          description: Bucket deleted

  /planner/buckets/{bucket_id}/tasks:
    get:
      operationId: getBucketTasks
      summary: Get all tasks within a specific bucket/phase
      parameters:
        - name: bucket_id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Tasks in bucket

  /groups/{group_id}/members:
    get:
      operationId: listProjectResources
      summary: List all resources (team members) assigned to a project group
      parameters:
        - name: group_id
          in: path
          required: true
          schema: { type: string }
        - name: $select
          in: query
          schema:
            type: string
            example: "id,displayName,mail,jobTitle,department"
      responses:
        "200":
          description: Project resources/team members

  /groups/{group_id}/members/$ref:
    post:
      operationId: addResource
      summary: Add a resource/member to a project group
      parameters:
        - name: group_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: ["@odata.id"]
              properties:
                "@odata.id":
                  type: string
                  example: "https://graph.microsoft.com/v1.0/users/user-id"
      responses:
        "204":
          description: Resource added to project

  /sites/{site_id}/lists/{list_id}/items:
    get:
      operationId: listRisks
      summary: List project risks or issues from SharePoint list
      parameters:
        - name: site_id
          in: path
          required: true
          schema: { type: string }
        - name: list_id
          in: path
          required: true
          schema: { type: string, description: Risks or Issues list ID }
        - name: $expand
          in: query
          schema: { type: string, example: "fields" }
        - name: $filter
          in: query
          schema: { type: string, example: "fields/Status eq 'Active'" }
        - name: $orderby
          in: query
          schema: { type: string, example: "fields/Priority desc" }
      responses:
        "200":
          description: Risk/Issue items with all field data

    post:
      operationId: createRisk
      summary: Create a new risk or issue item
      parameters:
        - name: site_id
          in: path
          required: true
          schema: { type: string }
        - name: list_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [fields]
              properties:
                fields:
                  type: object
                  properties:
                    Title:
                      type: string
                      example: "Risk: Third-party API delay"
                    Description: { type: string }
                    Probability:
                      type: string
                      enum: [Low, Medium, High]
                    Impact:
                      type: string
                      enum: [Low, Medium, High]
                    Status:
                      type: string
                      enum: [Active, Closed, Resolved]
                    DueDate: { type: string, format: date }
                    MitigationPlan: { type: string }
                    AssignedToId:   { type: string }
      responses:
        "201":
          description: Risk/Issue created

  /sites/{site_id}/lists/{list_id}/items/{item_id}:
    patch:
      operationId: updateRisk
      summary: Update a risk or issue status and details
      parameters:
        - name: site_id
          in: path
          required: true
          schema: { type: string }
        - name: list_id
          in: path
          required: true
          schema: { type: string }
        - name: item_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                fields:
                  type: object
                  properties:
                    Status:           { type: string }
                    MitigationPlan:   { type: string }
                    ContingencyPlan:  { type: string }
                    Resolution:       { type: string }
      responses:
        "200":
          description: Risk/Issue updated

  /planner/plans/{plan_id}/tasks/delta:
    get:
      operationId: getDeltaTasks
      summary: Incremental task sync - only fetch what changed since last sync
      parameters:
        - name: plan_id
          in: path
          required: true
          schema: { type: string }
        - name: $deltaToken
          in: query
          schema:
            type: string
            description: Token from previous response - reuse for incremental sync
      responses:
        "200":
          description: Changed tasks only
          content:
            application/json:
              schema:
                type: object
                properties:
                  value:
                    type: array
                    items: { $ref: "#/components/schemas/Task" }
                  "@odata.deltaLink":
                    type: string
                    description: Save this for next incremental sync call
                  "@odata.nextLink": { type: string }

  /subscriptions:
    post:
      operationId: createProjectSubscription
      summary: Subscribe to real-time project task change notifications
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [changeType, notificationUrl, resource, expirationDateTime, clientState]
              properties:
                changeType:
                  type: string
                  example: "created,updated,deleted"
                notificationUrl:
                  type: string
                  format: uri
                  example: "https://yourapp.com/webhooks/project"
                resource:
                  type: string
                  description: Resource path to monitor
                  example: "/planner/plans/{plan_id}/tasks"
                expirationDateTime:
                  type: string
                  format: date-time
                  example: "2025-06-01T00:00:00Z"
                clientState:
                  type: string
                  example: "my-project-webhook-secret"
      responses:
        "201":
          description: Subscription created for real-time project updates`
  }
}

export function AdvancedConfigStep({ formData, updateFormData }: AdvancedConfigStepProps) {

  const handleAuthTypeChange = (value: "none" | "api_key" | "oauth") => {
    updateFormData({
      authenticationType: value,
      apiKey: undefined,
      authType: undefined,
      customHeaderName: undefined,
      clientId: undefined,
      clientSecret: undefined,
      authorizationUrl: undefined,
      tokenUrl: undefined,
      scope: undefined,
      tokenExchangeMethod: undefined,
      schema: undefined,
      schemaText: undefined,
    })
  }

  const getAuthTypeLabel = () => {
    switch (formData.authenticationType || "none") {
      case "api_key":
        return "API Key"
      case "oauth":
        return "OAuth"
      default:
        return "None"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Advanced Configuration</h2>
        <p className="text-muted-foreground">
          Configure API settings and authentication for your assistant
        </p>
      </div>

      <div className="space-y-6">
        {/* Authentication Type Selection */}
        <div className="space-y-4">
          <Label>Authentication</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${formData.authenticationType === "none"
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
                }`}
              onClick={() => handleAuthTypeChange("none")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">None</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  No authentication required
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${formData.authenticationType === "api_key"
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
                }`}
              onClick={() => handleAuthTypeChange("api_key")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">API Key</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Use API keys for authentication
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${formData.authenticationType === "oauth"
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
                }`}
              onClick={() => handleAuthTypeChange("oauth")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">OAuth</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  OAuth 2.0 authentication flow
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure how your assistant authenticates with external APIs
          </p>
        </div>

        {/* API Key Authentication Fields */}
        {formData.authenticationType === "api_key" && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={formData.apiKey || ""}
                onChange={(e) => updateFormData({ apiKey: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Your API key for authentication (stored securely)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authType">Auth Type</Label>
              <Select
                value={formData.authType || "bearer"}
                onValueChange={(value: "basic" | "bearer" | "custom") =>
                  updateFormData({ authType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select auth type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic" className="focus:bg-muted focus:text-foreground">
                    Basic
                  </SelectItem>
                  <SelectItem value="bearer" className="focus:bg-muted focus:text-foreground">
                    Bearer
                  </SelectItem>
                  <SelectItem value="custom" className="focus:bg-muted focus:text-foreground">
                    Custom
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select how the API key should be sent in requests
              </p>
            </div>

            {formData.authType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customHeaderName">Custom Header Name</Label>
                <Input
                  id="customHeaderName"
                  placeholder="e.g., X-API-Key, Authorization"
                  value={formData.customHeaderName || ""}
                  onChange={(e) => updateFormData({ customHeaderName: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Specify the custom header name to send the API key
                </p>
              </div>
            )}
          </div>
        )}

        {/* OAuth Authentication Fields */}
        {formData.authenticationType === "oauth" && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="Enter client ID"
                value={formData.clientId || ""}
                onChange={(e) => updateFormData({ clientId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Enter client secret"
                value={formData.clientSecret || ""}
                onChange={(e) => updateFormData({ clientSecret: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Client secret (stored securely)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorizationUrl">Authorization URL</Label>
              <Input
                id="authorizationUrl"
                type="url"
                placeholder="https://example.com/oauth/authorize"
                value={formData.authorizationUrl || ""}
                onChange={(e) => updateFormData({ authorizationUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenUrl">Token URL</Label>
              <Input
                id="tokenUrl"
                type="url"
                placeholder="https://example.com/oauth/token"
                value={formData.tokenUrl || ""}
                onChange={(e) => updateFormData({ tokenUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope</Label>
              <Input
                id="scope"
                placeholder="read write"
                value={formData.scope || ""}
                onChange={(e) => updateFormData({ scope: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                OAuth scopes (space-separated)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenExchangeMethod">Token Exchange Method</Label>
              <Select
                value={formData.tokenExchangeMethod || "post"}
                onValueChange={(value: "post" | "basic_auth") =>
                  updateFormData({ tokenExchangeMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post" className="focus:bg-muted focus:text-foreground">
                    POST
                  </SelectItem>
                  <SelectItem value="basic_auth" className="focus:bg-muted focus:text-foreground">
                    Basic Auth
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Method used for token exchange
              </p>
            </div>
          </div>
        )}

        {/* OpenAPI Schema Field */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="schema">OpenAPI Schema (JSON or YAML)</Label>
            <div className="flex items-center gap-2">
              <Label htmlFor="examples" className="text-sm text-muted-foreground">Examples:</Label>
              <Select
                value=""
                onValueChange={(value: keyof typeof EXAMPLE_SCHEMAS) => {
                  if (value && EXAMPLE_SCHEMAS[value]) {
                    const selectedSchema = EXAMPLE_SCHEMAS[value].schema

                    // Trigger the same parsing logic as manual input
                    try {
                      const parseResult = parseSchemaText(selectedSchema)
                      if (parseResult.success && parseResult.data) {
                        const parsedOpenAPI = parseOpenAPISchema(parseResult.data)

                        // Prepare update object
                        const updates: any = {
                          schemaText: selectedSchema,
                          schema: parseResult.data
                        }

                        // Auto-populate authentication based on security schemes
                        if (parsedOpenAPI.securitySchemes && parsedOpenAPI.security && parsedOpenAPI.security.length > 0) {
                          const firstSecurityReq = parsedOpenAPI.security[0]
                          const securitySchemeName = Object.keys(firstSecurityReq)[0]

                          if (securitySchemeName && parsedOpenAPI.securitySchemes[securitySchemeName]) {
                            const scheme = parsedOpenAPI.securitySchemes[securitySchemeName]

                            if (scheme.type === 'apiKey') {
                              updates.authenticationType = 'api_key'
                              updates.authType = scheme.in === 'header' ? 'bearer' : 'basic'
                              if (scheme.in === 'header') {
                                updates.customHeaderName = scheme.name
                              }
                            } else if (scheme.type === 'http' && scheme.scheme === 'bearer') {
                              updates.authenticationType = 'api_key'
                              updates.authType = 'bearer'
                            } else if (scheme.type === 'oauth2') {
                              updates.authenticationType = 'oauth'
                              // Auto-populate OAuth URLs if available
                              if (scheme.flows?.authorizationCode) {
                                updates.authorizationUrl = scheme.flows.authorizationCode.authorizationUrl
                                updates.tokenUrl = scheme.flows.authorizationCode.tokenUrl
                                if (scheme.flows.authorizationCode.scopes) {
                                  updates.scope = Object.keys(scheme.flows.authorizationCode.scopes).join(' ')
                                }
                              }
                            }
                          }
                        } else {
                          // No security schemes detected - set to none
                          updates.authenticationType = 'none'
                        }

                        // Apply all updates at once
                        updateFormData(updates)
                      } else {
                        updateFormData({
                          schemaText: selectedSchema,
                          schema: undefined
                        })
                      }
                    } catch {
                      updateFormData({
                        schemaText: selectedSchema,
                        schema: undefined
                      })
                    }
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Choose example..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sharepoint" className="focus:bg-muted focus:text-foreground">
                    Microsoft SharePoint API
                  </SelectItem>
                  <SelectItem value="weather" className="focus:bg-muted focus:text-foreground">
                    Weather API
                  </SelectItem>
                  <SelectItem value="advice" className="focus:bg-muted focus:text-foreground">
                    Advice Slip API
                  </SelectItem>
                  <SelectItem value="seo" className="focus:bg-muted focus:text-foreground">
                    SEO Assistant API (DataForSEO)
                  </SelectItem>
                  <SelectItem value="trading" className="focus:bg-muted focus:text-foreground">
                    Trading Assistant API (Alpaca)
                  </SelectItem>
                  <SelectItem value="diese" className="focus:bg-muted focus:text-foreground">
                    Diese Integration API (Pipedream)
                  </SelectItem>
                  <SelectItem value="onenote" className="focus:bg-muted focus:text-foreground">
                    OneNote Integration API
                  </SelectItem>
                  <SelectItem value="teams" className="focus:bg-muted focus:text-foreground">
                    Microsoft Teams Integration API
                  </SelectItem>
                  <SelectItem value="project" className="focus:bg-muted focus:text-foreground">
                    Microsoft Project Integration API
                  </SelectItem>
                </SelectContent>
              </Select>
              <a
                href="/api-setup"
                target="_blank"
                rel="noopener noreferrer"
                title="View API Setup Guide"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Setup Guide
              </a>
            </div>
          </div>
          <Textarea
            id="schema"
            placeholder='Paste your OpenAPI schema here (JSON or YAML format)...'
            value={formData.schemaText || ""}
            onChange={(e) => {
              const value = e.target.value
              updateFormData({ schemaText: value })

              if (!value.trim()) {
                // Clear schema when empty
                updateFormData({ schema: undefined })
                return
              }

              try {
                // Parse the schema text (supports both JSON and YAML)
                const parseResult = parseSchemaText(value)

                if (parseResult.success && parseResult.data) {
                  // Check for security requirements and auto-populate authentication
                  const parsedOpenAPI = parseOpenAPISchema(parseResult.data)

                  // Auto-populate authentication if security schemes are detected
                  if (parsedOpenAPI.securitySchemes && parsedOpenAPI.security && parsedOpenAPI.security.length > 0) {
                    // Get the first security requirement
                    const firstSecurityReq = parsedOpenAPI.security[0]
                    const securitySchemeName = Object.keys(firstSecurityReq)[0]

                    if (securitySchemeName && parsedOpenAPI.securitySchemes[securitySchemeName]) {
                      const scheme = parsedOpenAPI.securitySchemes[securitySchemeName]

                      if (scheme.type === 'apiKey') {
                        // Auto-populate API key authentication
                        updateFormData({
                          authenticationType: 'api_key',
                          authType: scheme.in === 'header' ? 'bearer' : 'basic',
                          customHeaderName: scheme.in === 'header' ? scheme.name : undefined,
                          // Note: API key value still needs to be entered by user
                        })
                      } else if (scheme.type === 'http' && scheme.scheme === 'bearer') {
                        // Auto-populate bearer token authentication
                        updateFormData({
                          authenticationType: 'api_key',
                          authType: 'bearer',
                        })
                      } else if (scheme.type === 'oauth2') {
                        // Auto-populate OAuth authentication
                        updateFormData({
                          authenticationType: 'oauth',
                          authorizationUrl: scheme.flows?.authorizationCode?.authorizationUrl,
                          tokenUrl: scheme.flows?.authorizationCode?.tokenUrl,
                          scope: scheme.flows?.authorizationCode?.scopes ? Object.keys(scheme.flows.authorizationCode.scopes).join(' ') : undefined,
                        })
                      }
                    }
                  }

                  updateFormData({ schema: parseResult.data })
                } else {
                  updateFormData({ schema: undefined })
                }
              } catch {
                // Invalid JSON - keep the schema as undefined until valid
                updateFormData({ schema: undefined })
              }
            }}
            rows={20}
            style={{ height: '300px' }}
            className="resize-none font-mono text-sm overflow-y-auto"
          />
          <p className="text-sm text-muted-foreground">
            Supports both JSON and YAML formats
          </p>
        </div>

        {/* Schema Preview */}
        {formData.schemaText && (
          <div className="space-y-2">
            <SchemaPreview
              schemaText={formData.schemaText}
              authConfig={{
                authenticationType: formData.authenticationType,
                apiKey: formData.apiKey,
                authType: formData.authType,
                customHeaderName: formData.customHeaderName,
                clientId: formData.clientId,
                clientSecret: formData.clientSecret,
                authorizationUrl: formData.authorizationUrl,
                tokenUrl: formData.tokenUrl,
                scope: formData.scope,
                tokenExchangeMethod: formData.tokenExchangeMethod,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

