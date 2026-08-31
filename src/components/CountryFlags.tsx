import React from 'react';

interface FlagProps {
  countryCode: string;
  className?: string;
}

export function CountryFlag({ countryCode, className = "w-12 h-8 rounded-sm shadow-xs object-cover" }: FlagProps) {
  const code = countryCode.toUpperCase();

  switch (code) {
    case 'MZ':
    case 'MOZAMBIQUE':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#006600" />
          <rect y="13.3" width="60" height="13.4" fill="#000000" />
          <rect y="26.7" width="60" height="13.3" fill="#FFCC00" />
          <rect y="11.5" width="60" height="2" fill="#FFFFFF" />
          <rect y="26.5" width="60" height="2" fill="#FFFFFF" />
          <polygon points="0,0 26,20 0,40" fill="#D21034" />
          <polygon points="9,14 10.5,18.5 15,18.5 11.5,21 13,25.5 9,23 5,25.5 6.5,21 3,18.5 7.5,18.5" fill="#FFCC00" />
        </svg>
      );

    case 'BA':
    case 'BOSNIA':
    case 'BOSNIA HERZEGOVINA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#002366" />
          <polygon points="16,0 46,0 46,40" fill="#FFD700" />
          <g fill="#FFFFFF">
            <polygon points="14,2 15,5 18,5 15.5,7 16.5,10 14,8 11.5,10 12.5,7 10,5 13,5" />
            <polygon points="18,10 19,13 22,13 19.5,15 20.5,18 18,16 15.5,18 16.5,15 14,13 17,13" />
            <polygon points="22,18 23,21 26,21 23.5,23 24.5,26 22,24 19.5,26 20.5,23 18,21 21,21" />
            <polygon points="26,26 27,29 30,29 27.5,31 28.5,34 26,32 23.5,34 24.5,31 22,29 25,29" />
            <polygon points="30,34 31,37 34,37 31.5,39 32.5,42 30,40 27.5,42 28.5,39 26,37 29,37" />
          </g>
        </svg>
      );

    case 'EG':
    case 'EGYPT':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#CE1126" />
          <rect y="13.3" width="60" height="13.4" fill="#FFFFFF" />
          <rect y="26.7" width="60" height="13.3" fill="#000000" />
          {/* Eagle of Saladin */}
          <circle cx="30" cy="20" r="4.5" fill="#C09300" />
        </svg>
      );

    case 'DZ':
    case 'ALGERIA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="30" height="40" fill="#006633" />
          <rect x="30" width="30" height="40" fill="#FFFFFF" />
          <circle cx="30" cy="20" r="9" fill="#D21034" />
          <circle cx="33" cy="20" r="7.5" fill="#FFFFFF" />
          <polygon points="33,16 34.5,19.5 38,19.5 35,21.5 36,25 33,23 30,25 31,21.5 28,19.5 31.5,19.5" fill="#D21034" />
        </svg>
      );

    case 'TZ':
    case 'TANZANIA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="0,0 60,0 0,40" fill="#1EB53A" />
          <polygon points="60,0 60,40 0,40" fill="#00A3DD" />
          <polygon points="0,40 10,40 60,7 60,0 50,0 0,33" fill="#FCD116" />
          <polygon points="0,40 6,40 60,4 60,0 54,0 0,36" fill="#000000" />
        </svg>
      );

    case 'BD':
    case 'BANGLADESH':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#006A4E" />
          <circle cx="27" cy="20" r="11" fill="#F42A41" />
        </svg>
      );

    case 'IN':
    case 'INDIA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#FF9933" />
          <rect y="13.3" width="60" height="13.4" fill="#FFFFFF" />
          <rect y="26.7" width="60" height="13.3" fill="#138808" />
          <circle cx="30" cy="20" r="5" stroke="#000080" strokeWidth="1.2" fill="none" />
        </svg>
      );

    case 'PK':
    case 'PAKISTAN':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#01411C" />
          <rect width="15" height="40" fill="#FFFFFF" />
          <circle cx="38" cy="20" r="9" fill="#FFFFFF" />
          <circle cx="41" cy="18" r="8" fill="#01411C" />
          <polygon points="41,14 42,16.5 44.5,16.5 42.5,18 43.5,20.5 41,19 38.5,20.5 39.5,18 37.5,16.5 40,16.5" fill="#FFFFFF" />
        </svg>
      );

    case 'US':
    case 'USA':
    case 'UNITED STATES':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#B22234" />
          <rect y="3.1" width="60" height="3.1" fill="#FFFFFF" />
          <rect y="9.2" width="60" height="3.1" fill="#FFFFFF" />
          <rect y="15.4" width="60" height="3.1" fill="#FFFFFF" />
          <rect y="21.5" width="60" height="3.1" fill="#FFFFFF" />
          <rect y="27.7" width="60" height="3.1" fill="#FFFFFF" />
          <rect y="33.8" width="60" height="3.1" fill="#FFFFFF" />
          <rect width="25" height="21.5" fill="#3C3B6E" />
          <circle cx="6" cy="6" r="1" fill="#FFFFFF" />
          <circle cx="12" cy="6" r="1" fill="#FFFFFF" />
          <circle cx="18" cy="6" r="1" fill="#FFFFFF" />
          <circle cx="9" cy="11" r="1" fill="#FFFFFF" />
          <circle cx="15" cy="11" r="1" fill="#FFFFFF" />
          <circle cx="6" cy="16" r="1" fill="#FFFFFF" />
          <circle cx="12" cy="16" r="1" fill="#FFFFFF" />
          <circle cx="18" cy="16" r="1" fill="#FFFFFF" />
        </svg>
      );

    case 'GB':
    case 'UK':
    case 'UNITED KINGDOM':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#012169" />
          <polygon points="0,0 60,40" stroke="#FFFFFF" strokeWidth="6" />
          <polygon points="0,40 60,0" stroke="#FFFFFF" strokeWidth="6" />
          <polygon points="0,0 60,40" stroke="#C8102E" strokeWidth="2.5" />
          <polygon points="0,40 60,0" stroke="#C8102E" strokeWidth="2.5" />
          <rect x="25" width="10" height="40" fill="#FFFFFF" />
          <rect y="15" width="60" height="10" fill="#FFFFFF" />
          <rect x="27" width="6" height="40" fill="#C8102E" />
          <rect y="17" width="60" height="6" fill="#C8102E" />
        </svg>
      );

    case 'NG':
    case 'NIGERIA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="40" fill="#008751" />
          <rect x="20" width="20" height="40" fill="#FFFFFF" />
          <rect x="40" width="20" height="40" fill="#008751" />
        </svg>
      );

    case 'ID':
    case 'INDONESIA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="20" fill="#FF0000" />
          <rect y="20" width="60" height="20" fill="#FFFFFF" />
        </svg>
      );

    case 'SL':
    case 'SIERRA LEONE':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#1EB53A" />
          <rect y="13.3" width="60" height="13.4" fill="#FFFFFF" />
          <rect y="26.7" width="60" height="13.3" fill="#0072C6" />
        </svg>
      );

    case 'CM':
    case 'CAMEROON':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="40" fill="#007A3D" />
          <rect x="20" width="20" height="40" fill="#CE1126" />
          <rect x="40" width="20" height="40" fill="#FCD116" />
          <polygon points="30,16 31.5,19.5 35,19.5 32,21.5 33,25 30,23 27,25 28,21.5 25,19.5 28.5,19.5" fill="#FCD116" />
        </svg>
      );

    case 'CI':
    case 'IVORY COAST':
    case "COTE D'IVOIRE":
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="40" fill="#F77F00" />
          <rect x="20" width="20" height="40" fill="#FFFFFF" />
          <rect x="40" width="20" height="40" fill="#009E60" />
        </svg>
      );

    case 'GH':
    case 'GHANA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#CE1126" />
          <rect y="13.3" width="60" height="13.4" fill="#FCD116" />
          <rect y="26.7" width="60" height="13.3" fill="#006B3F" />
          <polygon points="30,16 31.5,19.5 35,19.5 32,21.5 33,25 30,23 27,25 28,21.5 25,19.5 28.5,19.5" fill="#000000" />
        </svg>
      );

    case 'KE':
    case 'KENYA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="11" fill="#000000" />
          <rect y="11" width="60" height="2" fill="#FFFFFF" />
          <rect y="13" width="60" height="14" fill="#990000" />
          <rect y="27" width="60" height="2" fill="#FFFFFF" />
          <rect y="29" width="60" height="11" fill="#006600" />
          <ellipse cx="30" cy="20" rx="4" ry="9" fill="#990000" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      );

    case 'PH':
    case 'PHILIPPINES':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="20" fill="#0038A8" />
          <rect y="20" width="60" height="20" fill="#CE1126" />
          <polygon points="0,0 28,20 0,40" fill="#FFFFFF" />
          <circle cx="9" cy="20" r="3.5" fill="#FCD116" />
        </svg>
      );

    case 'AF':
    case 'AFGHANISTAN':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="40" fill="#000000" />
          <rect x="20" width="20" height="40" fill="#D32011" />
          <rect x="40" width="20" height="40" fill="#007A36" />
        </svg>
      );

    case 'BR':
    case 'BRAZIL':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#009C3B" />
          <polygon points="30,4 56,20 30,36 4,20" fill="#FFDF00" />
          <circle cx="30" cy="20" r="7" fill="#002776" />
        </svg>
      );

    case 'ME':
    case 'MONTENEGRO':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#D32011" stroke="#E5B200" strokeWidth="2.5" />
          <circle cx="30" cy="20" r="6" fill="#E5B200" />
        </svg>
      );

    case 'SN':
    case 'SENEGAL':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="40" fill="#00853F" />
          <rect x="20" width="20" height="40" fill="#FDEF42" />
          <rect x="40" width="20" height="40" fill="#E31B23" />
          <polygon points="30,16 31.5,19.5 35,19.5 32,21.5 33,25 30,23 27,25 28,21.5 25,19.5 28.5,19.5" fill="#00853F" />
        </svg>
      );

    case 'UG':
    case 'UGANDA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="6.6" fill="#000000" />
          <rect y="6.6" width="60" height="6.7" fill="#FCDC04" />
          <rect y="13.3" width="60" height="6.7" fill="#D90000" />
          <rect y="20" width="60" height="6.6" fill="#000000" />
          <rect y="26.6" width="60" height="6.7" fill="#FCDC04" />
          <rect y="33.3" width="60" height="6.7" fill="#D90000" />
          <circle cx="30" cy="20" r="5" fill="#FFFFFF" />
          <circle cx="30" cy="20" r="2.5" fill="#000000" />
        </svg>
      );

    case 'AE':
    case 'UAE':
    case 'UNITED ARAB EMIRATES':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#00732F" />
          <rect y="13.3" width="60" height="13.4" fill="#FFFFFF" />
          <rect y="26.7" width="60" height="13.3" fill="#000000" />
          <rect width="15" height="40" fill="#FF0000" />
        </svg>
      );

    case 'SA':
    case 'SAUDI ARABIA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#006C35" />
          <rect x="15" y="24" width="30" height="2" fill="#FFFFFF" />
          <circle cx="30" cy="16" r="4" fill="#FFFFFF" />
        </svg>
      );

    case 'MA':
    case 'MOROCCO':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#C1272D" />
          <polygon points="30,12 32.5,19.5 40,19.5 34,24 36.5,31.5 30,27 23.5,31.5 26,24 20,19.5 27.5,19.5" fill="none" stroke="#006233" strokeWidth="1.5" />
        </svg>
      );

    case 'DE':
    case 'GERMANY':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#000000" />
          <rect y="13.3" width="60" height="13.4" fill="#DD0000" />
          <rect y="26.7" width="60" height="13.3" fill="#FFCE00" />
        </svg>
      );

    case 'FR':
    case 'FRANCE':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="40" fill="#002395" />
          <rect x="20" width="20" height="40" fill="#FFFFFF" />
          <rect x="40" width="20" height="40" fill="#ED2939" />
        </svg>
      );

    case 'RU':
    case 'RUSSIA':
    case 'KAZAKHSTAN':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#FFFFFF" />
          <rect y="13.3" width="60" height="13.4" fill="#0039A6" />
          <rect y="26.7" width="60" height="13.3" fill="#D52B1E" />
        </svg>
      );

    case 'BJ':
    case 'BENIN':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="40" fill="#008751" />
          <rect x="24" width="36" height="20" fill="#FCD116" />
          <rect x="24" y="20" width="36" height="20" fill="#E8112D" />
        </svg>
      );

    case 'TG':
    case 'TOGO':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="8" fill="#006A4E" />
          <rect y="8" width="60" height="8" fill="#FFCE00" />
          <rect y="16" width="60" height="8" fill="#006A4E" />
          <rect y="24" width="60" height="8" fill="#FFCE00" />
          <rect y="32" width="60" height="8" fill="#006A4E" />
          <rect width="20" height="20" fill="#D21034" />
          <polygon points="10,4 11.5,8 15.5,8 12.5,10.5 13.5,14.5 10,12 6.5,14.5 7.5,10.5 4.5,8 8.5,8" fill="#FFFFFF" />
        </svg>
      );

    case 'MG':
    case 'MADAGASCAR':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="40" fill="#FFFFFF" />
          <rect x="20" width="40" height="20" fill="#FC3D32" />
          <rect x="20" y="20" width="40" height="20" fill="#007E3A" />
        </svg>
      );

    case 'CF':
    case 'CENTRAL AFRICAN REPUBLIC':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="10" fill="#003082" />
          <rect y="10" width="60" height="10" fill="#FFFFFF" />
          <rect y="20" width="60" height="10" fill="#289728" />
          <rect y="30" width="60" height="10" fill="#FFCE00" />
          <rect x="25" width="10" height="40" fill="#D21034" />
        </svg>
      );

    case 'TJ':
    case 'TAJIKISTAN':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="11.4" fill="#D90000" />
          <rect y="11.4" width="60" height="17.2" fill="#FFFFFF" />
          <rect y="28.6" width="60" height="11.4" fill="#008000" />
          <circle cx="30" cy="20" r="3.5" fill="#F8B800" />
        </svg>
      );

    case 'YE':
    case 'YEMEN':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#CE1126" />
          <rect y="13.3" width="60" height="13.4" fill="#FFFFFF" />
          <rect y="26.7" width="60" height="13.3" fill="#000000" />
        </svg>
      );

    case 'IQ':
    case 'IRAQ':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#CE1126" />
          <rect y="13.3" width="60" height="13.4" fill="#FFFFFF" />
          <rect y="26.7" width="60" height="13.3" fill="#000000" />
          <text x="30" y="24" fontSize="7" fill="#007A3D" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">الله أكبر</text>
        </svg>
      );

    case 'LK':
    case 'SRI LANKA':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#FFBE29" />
          <rect x="3" y="3" width="8" height="34" fill="#00534E" />
          <rect x="13" y="3" width="8" height="34" fill="#EB7400" />
          <rect x="23" y="3" width="34" height="34" fill="#8D153A" />
          <circle cx="40" cy="20" r="8" fill="#FFBE29" />
        </svg>
      );

    case 'MW':
    case 'MALAWI':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#000000" />
          <rect y="13.3" width="60" height="13.4" fill="#D90000" />
          <rect y="26.7" width="60" height="13.3" fill="#118833" />
          <circle cx="30" cy="13.3" r="5" fill="#D90000" />
        </svg>
      );

    case 'AZ':
    case 'AZERBAIJAN':
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="13.3" fill="#00B5E2" />
          <rect y="13.3" width="60" height="13.4" fill="#EF3340" />
          <rect y="26.7" width="60" height="13.3" fill="#509E2F" />
          <circle cx="28" cy="20" r="3.5" fill="#FFFFFF" />
          <circle cx="29" cy="20" r="2.8" fill="#EF3340" />
        </svg>
      );

    default:
      return (
        <svg className={className} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#3B82F6" />
          <circle cx="30" cy="20" r="10" fill="#FFFFFF" />
        </svg>
      );
  }
}
