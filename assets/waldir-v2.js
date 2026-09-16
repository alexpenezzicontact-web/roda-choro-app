window.RODA_ASSETS=window.RODA_ASSETS||{};
window.RODA_ASSETS.waldir="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e6b76f"/><stop offset="1" stop-color="#c96f4d"/>
    </linearGradient>
    <filter id="grain"><feTurbulence baseFrequency=".7" numOctaves="2" seed="4" type="fractalNoise" result="n"/><feColorMatrix in="n" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .07 0"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
  </defs>
  <rect width="512" height="512" rx="36" fill="url(#bg)"/>
  <circle cx="408" cy="93" r="54" fill="#f3d690" opacity=".72"/>
  <path d="M0 375 C90 330 132 350 190 318 C257 279 327 300 512 245 V512 H0Z" fill="#153f35" opacity=".22"/>
  <g filter="url(#grain)">
    <path d="M78 510 C95 414 143 354 226 344 C320 332 392 387 421 510Z" fill="#123b33"/>
    <path d="M196 353 l44 59 45-59 29 157H169Z" fill="#f6ead5"/>
    <path d="M238 407 l22 0 20 103h-62z" fill="#1b2e29"/>
    <path d="M167 155 C182 85 257 47 324 77 C375 100 394 160 380 218 C368 268 330 318 268 325 C210 332 164 297 150 242 C142 211 146 178 167 155Z" fill="#c9895f"/>
    <path d="M165 169 C166 92 239 52 314 69 C350 77 375 97 389 128 C357 111 325 105 294 113 C255 123 225 144 198 171 C184 184 175 184 165 169Z" fill="#142e29"/>
    <path d="M184 121 C224 78 282 68 341 91 C309 86 274 92 242 108 C218 120 199 135 184 151Z" fill="#203a33"/>
    <ellipse cx="153" cy="215" rx="22" ry="33" fill="#c08059"/><ellipse cx="380" cy="207" rx="18" ry="31" fill="#c08059"/>
    <path d="M211 186 q32-18 58 0" stroke="#1b302a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M302 179 q29-15 52 2" stroke="#1b302a" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="242" cy="202" rx="9" ry="6" fill="#112d27"/><ellipse cx="329" cy="197" rx="9" ry="6" fill="#112d27"/>
    <path d="M286 200 q-8 39-2 53 q10 8 24 0" stroke="#8a563f" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M230 275 q54 34 107-2" stroke="#6b3f33" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M250 286 q37 14 68-2" stroke="#f0c9a8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".65"/>
    <g transform="rotate(-16 300 390)">
      <ellipse cx="325" cy="417" rx="78" ry="64" fill="#d69745" stroke="#5d3a25" stroke-width="8"/>
      <ellipse cx="327" cy="416" rx="22" ry="18" fill="#1e302b"/>
      <rect x="316" y="258" width="24" height="133" rx="8" fill="#5d3a25"/>
      <rect x="307" y="244" width="42" height="31" rx="8" fill="#4a2f20"/>
      <circle cx="312" cy="250" r="5" fill="#e1b56a"/><circle cx="344" cy="250" r="5" fill="#e1b56a"/>
      <circle cx="312" cy="267" r="5" fill="#e1b56a"/><circle cx="344" cy="267" r="5" fill="#e1b56a"/>
      <path d="M321 258v158M327 258v158M333 258v158M339 258v158" stroke="#f5dfaf" stroke-width="2"/>
      <rect x="292" y="447" width="72" height="8" rx="4" fill="#5a3926"/>
    </g>
    <path d="M216 383 C245 365 275 361 303 369 C316 373 321 388 310 399 C298 411 272 405 250 409 C228 413 207 406 202 398 C198 391 204 386 216 383Z" fill="#bd7b58"/>
    <path d="M333 322 C345 311 363 306 376 315 C385 322 383 335 374 343 C365 351 349 350 337 344 C327 339 325 330 333 322Z" fill="#bd7b58"/>
  </g>
</svg>`);
