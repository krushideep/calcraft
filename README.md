
# 🗓️ CalCraft

**CalCraft** is a professional-grade, highly customizable, and privacy-focused HTML calendar generator. Designed for users who want to craft beautiful, printable calendars without complex design software.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-6-purple)

## ✨ Features

- **📂 ICS Integration**: Import your existing digital life by uploading `.ics` files from Google Calendar, Outlook, or Apple Calendar.
- **🎨 Deep Customization**:
  - **Typography**: Choose from curated font pairings (Playfair Display, Lora, Inter, Montserrat, Space Mono).
  - **Layout Architecture**: Drag-and-drop or reorder blocks (Images, Titles, Quotes, Grids) to suit your aesthetic.
  - **Theme Accents**: Precise color control over accents or a clean "minimalist" mode.
- **🖼️ Monthly Imagery**: Upload custom photos for every month with high-quality scaling.
- **✍️ Manual Inspiration**: Add personalized quotes or notes to each month page.
- **📅 Advanced Grid Controls**:
  - Standard 7-column layout or "Linear Strip" mode for planners.
  - Transparent backgrounds for printing on colored paper.
  - Toggle grid lines and day labels.
- **🖨️ Professional Export**:
  - **PDF**: Single-click multi-page PDF generation optimized for A4/A5/Custom sizes.
  - **PNG**: Export individual high-resolution months as a ZIP-ready batch.

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Libraries**: 
  - `html2pdf.js` for document generation.
  - `html2canvas` for high-resolution image rendering.
- **Deployment**: GitHub Actions (CI/CD)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/calcraft.git
   cd calcraft
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 📦 Deployment

This project is pre-configured for **GitHub Pages**.

1. Push your code to the `main` branch of your GitHub repository.
2. Go to **Settings > Pages** in your repository.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. Your site will be live at `https://YOUR_USERNAME.github.io/calcraft/` within minutes.

## 🛡️ Privacy

CalCraft is a client-side application. **Your data never leaves your browser.** Calendar files, images, and custom quotes are processed locally and are not stored on any server or shared with third-party AI services.

---

Crafted with ❤️ for the planning community.
