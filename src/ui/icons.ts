/* Hand-drawn inline SVG, not photography, so the page works offline and over a
   shared link with no external image dependency. Lifted unchanged from the
   original — the drawings were never the problem. */

export const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>

<symbol id="i-chicken" viewBox="0 0 48 48">
<path d="M31 9c6 0 10 4 10 9 0 7-6 11-13 12-5 1-8 3-10 6-2 3-6 4-9 2-3-2-3-6-1-9 2-3 4-5 5-9C15 13 22 9 31 9Z" fill="#F0C9A0" stroke="#B23A2E" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M9 29c-2 3-4 4-6 8m6-8 2 6" stroke="#B23A2E" stroke-width="1.8" stroke-linecap="round"/>
<circle cx="30" cy="19" r="2.4" fill="#B23A2E" opacity=".28"/>
</symbol>

<symbol id="i-fish" viewBox="0 0 48 48">
<path d="M4 24c6-9 15-13 23-13 8 0 14 5 17 13-3 8-9 13-17 13-8 0-17-4-23-13Z" fill="#CFE0EE" stroke="#4A6FA5" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M44 24c0-4 0-7-1-9-3 2-5 5-6 9 1 4 3 7 6 9 1-2 1-5 1-9Z" fill="#4A6FA5" opacity=".3"/>
<circle cx="14" cy="21" r="2" fill="#4A6FA5"/>
<path d="M20 30c4 2 8 2 12 0" stroke="#4A6FA5" stroke-width="1.6" stroke-linecap="round"/>
</symbol>

<symbol id="i-paneer" viewBox="0 0 48 48">
<path d="M7 18h34v20H7z" fill="#FDF6E4" stroke="#C08A1E" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M7 18l6-8h34l-6 8m6-8v20l-6 8" fill="#F6E9C9" stroke="#C08A1E" stroke-width="1.8" stroke-linejoin="round"/>
<circle cx="17" cy="27" r="2" fill="#C08A1E" opacity=".35"/>
<circle cx="30" cy="31" r="1.6" fill="#C08A1E" opacity=".35"/>
</symbol>

<symbol id="i-yoghurt" viewBox="0 0 48 48">
<path d="M11 16h26l-3 24H14L11 16Z" fill="#FFFFFF" stroke="#4A6FA5" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M9 12h30v5H9z" fill="#CFE0EE" stroke="#4A6FA5" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M16 24h16l-1 8H17z" fill="#B23A2E" opacity=".3"/>
</symbol>

<symbol id="i-dal" viewBox="0 0 48 48">
<path d="M5 22h38c0 10-8 17-19 17S5 32 5 22Z" fill="#F2D9A8" stroke="#C08A1E" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M3 22h42" stroke="#C08A1E" stroke-width="1.8" stroke-linecap="round"/>
<ellipse cx="18" cy="28" rx="3" ry="2.2" fill="#C08A1E" opacity=".45"/>
<ellipse cx="27" cy="31" rx="3" ry="2.2" fill="#C08A1E" opacity=".45"/>
<path d="M17 15c0-3 3-3 3-6m8 6c0-3 3-3 3-6" stroke="#C08A1E" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>
</symbol>

<symbol id="i-rice" viewBox="0 0 48 48">
<path d="M7 26h34c0 8-7 14-17 14S7 34 7 26Z" fill="#EFEAE0" stroke="#5C6470" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M12 26c1-8 6-13 12-13s11 5 12 13" fill="#FFFFFF" stroke="#5C6470" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M20 19h1m4 3h1m-8 1h1m10-4h1" stroke="#5C6470" stroke-width="2.2" stroke-linecap="round"/>
</symbol>

<symbol id="i-roti" viewBox="0 0 48 48">
<circle cx="24" cy="24" r="17" fill="#F2D9A8" stroke="#C08A1E" stroke-width="1.8"/>
<circle cx="19" cy="19" r="2.4" fill="#C08A1E" opacity=".4"/>
<circle cx="30" cy="26" r="2" fill="#C08A1E" opacity=".4"/>
<circle cx="22" cy="31" r="1.6" fill="#C08A1E" opacity=".4"/>
</symbol>

<symbol id="i-egg" viewBox="0 0 48 48">
<path d="M24 6c8 0 14 12 14 21 0 8-6 14-14 14s-14-6-14-14C10 18 16 6 24 6Z" fill="#FFFFFF" stroke="#C08A1E" stroke-width="1.8"/>
<circle cx="24" cy="27" r="7" fill="#F2C230" stroke="#C08A1E" stroke-width="1.6"/>
</symbol>

<symbol id="i-greens" viewBox="0 0 48 48">
<path d="M24 42V20" stroke="#0F5449" stroke-width="2" stroke-linecap="round"/>
<path d="M24 22C18 22 11 18 9 9c9-1 15 4 15 13Z" fill="#BFD8CE" stroke="#0F5449" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M24 26c6 0 13-4 15-13-9-1-15 4-15 13Z" fill="#BFD8CE" stroke="#0F5449" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M24 34c-5 0-10-3-12-10 7-1 12 3 12 10Z" fill="#DCEAE3" stroke="#0F5449" stroke-width="1.8" stroke-linejoin="round"/>
</symbol>

<symbol id="i-gourd" viewBox="0 0 48 48">
<path d="M30 17c5 3 8 8 8 13 0 6-5 11-12 11s-12-5-12-11c0-6 4-11 9-13" fill="#BFD8CE" stroke="#0F5449" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M23 18c0-6 1-10 3-13 2 3 3 7 3 13" fill="#DCEAE3" stroke="#0F5449" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M22 30c1 3 4 5 7 5" stroke="#0F5449" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
</symbol>

<symbol id="i-broccoli" viewBox="0 0 48 48">
<path d="M19 26h10v13a5 5 0 0 1-10 0V26Z" fill="#DCEAE3" stroke="#0F5449" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M24 6c4 0 7 2 8 5 4 0 7 3 7 7s-3 8-8 8H17c-5 0-8-4-8-8s3-7 7-7c1-3 4-5 8-5Z" fill="#BFD8CE" stroke="#0F5449" stroke-width="1.8" stroke-linejoin="round"/>
</symbol>

<symbol id="i-whey" viewBox="0 0 48 48">
<path d="M13 18h22v20a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4V18Z" fill="#EFEAE0" stroke="#5C6470" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M17 7h14v11H17z" fill="#B23A2E" stroke="#5C6470" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M18 26h12v8H18z" fill="#B23A2E" opacity=".28"/>
</symbol>

<symbol id="i-soya" viewBox="0 0 48 48">
<circle cx="16" cy="18" r="7" fill="#F2D9A8" stroke="#C08A1E" stroke-width="1.8"/>
<circle cx="30" cy="24" r="8" fill="#F2D9A8" stroke="#C08A1E" stroke-width="1.8"/>
<circle cx="18" cy="33" r="6.5" fill="#F2D9A8" stroke="#C08A1E" stroke-width="1.8"/>
<circle cx="16" cy="16" r="1.8" fill="#C08A1E" opacity=".4"/>
<circle cx="29" cy="22" r="1.8" fill="#C08A1E" opacity=".4"/>
</symbol>

<symbol id="i-oats" viewBox="0 0 48 48">
<path d="M6 25h36c0 9-8 15-18 15S6 34 6 25Z" fill="#EFEAE0" stroke="#5C6470" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M4 25h40" stroke="#5C6470" stroke-width="1.8" stroke-linecap="round"/>
<ellipse cx="17" cy="30" rx="3" ry="2" fill="#C08A1E" opacity=".4"/>
<ellipse cx="27" cy="33" rx="3" ry="2" fill="#C08A1E" opacity=".4"/>
<path d="M24 21V8m0 6 5-4m-5 8-5-5" stroke="#0F5449" stroke-width="1.8" stroke-linecap="round"/>
</symbol>

<symbol id="i-prawn" viewBox="0 0 48 48">
<path d="M38 14c-11 0-19 6-19 14 0 6 4 11 10 12-8 1-16-5-16-14 0-11 10-18 25-18Z" fill="#F0C9A0" stroke="#B23A2E" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M40 12c-3 1-5 3-6 5" stroke="#B23A2E" stroke-width="1.6" stroke-linecap="round"/>
<circle cx="33" cy="18" r="1.8" fill="#B23A2E"/>
</symbol>

<symbol id="i-tofu" viewBox="0 0 48 48">
<path d="M10 20h28v18H10z" fill="#FDF6E4" stroke="#5C6470" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M10 20l5-7h28l-5 7m5-7v18l-5 7" fill="#EFEAE0" stroke="#5C6470" stroke-width="1.8" stroke-linejoin="round"/>
</symbol>

<symbol id="i-oil" viewBox="0 0 48 48">
<path d="M24 42c-6 0-11-5-11-11 0-8 11-21 11-21s11 13 11 21c0 6-5 11-11 11Z" fill="#F6E9C9" stroke="#C08A1E" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M20 31c0 3 2 5 4 6" stroke="#C08A1E" stroke-width="1.6" stroke-linecap="round"/>
</symbol>

`;

export const ico = (n: string): string => `<svg aria-hidden="true"><use href="#i-${n}"></use></svg>`;
