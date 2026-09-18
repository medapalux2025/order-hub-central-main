# Order Hub Central

Build a production-ready multi-product e-commerce order management platform called "OrderHub".

The platform is designed for a business that sells multiple products through multiple independent landing pages and Facebook/TikTok/Instagram advertising campaigns.

The main concept:

I want to have ONE centralized admin platform where all orders from ALL my landing pages are automatically collected and managed.

TECH STACK:

- React + TypeScript

- Tailwind CSS

- Modern component architecture

- Supabase for database, authentication, realtime updates, and backend

- Responsive web application

- Clean, scalable, production-ready code

IMPORTANT:

Do not build a simple demo or static dashboard.

Build a real functional application with Supabase integration and a well-designed database schema.

====================================

1. MAIN ADMIN DASHBOARD

====================================

Create a premium modern admin dashboard with:

- Total Orders

- New Orders

- Confirmed Orders

- Orders in Preparation

- Shipped Orders

- Delivered Orders

- Cancelled Orders

- Total Revenue

- Conversion statistics

- Recent orders

- Sales performance chart

- Orders by product

- Orders by city

- Orders by landing page

- Orders by advertising source

Use beautiful cards, charts, tables, filters, and clean spacing.

The dashboard should feel like a professional SaaS ecommerce operations platform.

====================================

2. ORDER MANAGEMENT

====================================

Create a complete Orders page.

Each order should contain:

- Order ID

- Customer name

- Phone number

- City

- Address

- Product

- Quantity

- Unit price

- Total price

- Order status

- Source

- Landing page

- Notes

- Created date

- Updated date

Order statuses:

- New

- Confirmed

- Preparing

- Shipped

- Delivered

- Cancelled

- Returned

Features:

- Search by customer name or phone

- Filter by status

- Filter by product

- Filter by city

- Filter by date

- Filter by landing page

- Filter by source

- Sort orders

- View order details

- Edit order

- Change order status

- Add internal notes

- Delete order with confirmation

- Export orders to CSV/Excel

- Pagination

Add a professional order details drawer or detail page.

====================================

3. PRODUCTS MANAGEMENT

====================================

Create Products management.

Each product:

- Product name

- Slug

- Description

- Product image

- SKU

- Price

- Compare-at price

- Stock quantity

- Active/inactive

- Created date

Features:

- Add product

- Edit product

- Delete product

- Activate/deactivate product

- View product performance

- Number of orders per product

- Revenue per product

====================================

4. LANDING PAGES MANAGEMENT

====================================

Create a Landing Pages section.

The business may have many landing pages, for example:

- USB Quran

- USB Premium

- Product A

- Product B

Each landing page should contain:

- Landing page name

- Slug

- Connected product

- Landing page URL

- Active/inactive

- Total orders

- Total revenue

- Conversion statistics

The platform should support connecting multiple landing pages to the same centralized order system.

====================================

5. PUBLIC ORDER API / ORDER FORM

====================================

This is extremely important.

Create a secure public order submission mechanism that can be used by ANY external landing page.

Every landing page should be able to submit orders to Supabase through a public order endpoint or secure Edge Function.

Example:

POST /api/orders

Payload:

{

"product_id": "...",

"landing_page_id": "...",

"customer_name": "...",

"phone": "...",

"city": "...",

"address": "...",

"quantity": 1,

"source": "facebook",

"campaign": "usb_campaign_01",

"notes": "..."

}

The system must automatically calculate the total price from the product price stored in the database.

Do not trust prices sent by the frontend.

Implement proper validation and security.

====================================

6. TRACKING ADVERTISING SOURCES

====================================

Support tracking parameters such as:

?utm_source=facebook

&utm_medium=paid

&utm_campaign=usb_campaign

&utm_content=video_01

Store these values with every order.

Track:

- Facebook orders

- TikTok orders

- Instagram orders

- Organic orders

- Landing page performance

- Campaign performance

Create analytics showing which source generates the most orders and revenue.

====================================

7. CUSTOMERS MANAGEMENT

====================================

Create a Customers page.

Customer fields:

- Name

- Phone

- City

- Address

- Total orders

- Total spent

- Last order date

- Customer status

Features:

- Search customers

- View customer order history

- Detect possible duplicate orders by phone number

- View customer details

====================================

8. DATABASE DESIGN

====================================

Create proper Supabase tables with relationships:

- profiles

- products

- landing_pages

- orders

- order_items

- customers

- order_status_history

Use UUID primary keys, timestamps, foreign keys, indexes, and proper constraints.

Create Row Level Security policies.

Admin users should be able to manage all data.

Public users should only be able to submit valid orders through the secure order submission mechanism.

Never expose service role keys in frontend code.

====================================

9. REALTIME UPDATES

====================================

Use Supabase Realtime.

When a new order arrives from any landing page:

- The admin dashboard updates automatically

- Show a new order notification

- Update order counters

- Update recent orders

- Play an optional notification sound

====================================

10. UI / DESIGN

====================================

Design direction:

Premium modern SaaS dashboard.

- Clean white/light interface

- Optional dark mode

- Elegant sidebar navigation

- Professional typography

- Modern cards

- Beautiful tables

- Subtle borders

- Excellent spacing

- Responsive design

- Mobile-friendly admin dashboard

Use a consistent icon system such as Lucide.

Do not make it look like a generic template.

Make it feel like a real commercial ecommerce operations platform.

====================================

11. LANGUAGES

====================================

The platform should support:

- Arabic

- French

- English

Default language: French or Arabic.

The interface should be suitable for a Moroccan ecommerce business.

Use Moroccan currency MAD / DH.

====================================

12. IMPORTANT BUSINESS WORKFLOW

====================================

Example:

A customer visits:

landingpage.com/usb-quran

They submit:

Name: Ahmed

Phone: 06XXXXXXXX

City: Marrakech

Address: ...

Quantity: 1

The order must automatically appear in the centralized admin dashboard:

Order #1001

Product: USB Quran

Price: 139 DH

Source: Facebook

Landing Page: USB Quran

Status: New

The admin can then change:

New → Confirmed → Preparing → Shipped → Delivered

====================================

13. BUILD QUALITY

====================================

Before finishing:

- Create the complete Supabase schema

- Configure authentication

- Configure RLS

- Create realistic seed/demo data

- Make all dashboard pages functional

- Make forms functional

- Make filters functional

- Make order status updates functional

- Make realtime updates functional

- Ensure no broken buttons

- Ensure no placeholder-only functionality

- Ensure the application is scalable for hundreds of products and thousands of orders

Start by designing the database architecture and application structure, then implement the dashboard and all core functionality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4d4642af-a8fe-44eb-96f3-73d29ebba7a9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
