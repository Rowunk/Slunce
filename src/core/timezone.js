export function getTimezoneFromCoordinates(lat, lng, date) {
    const month = date.getMonth() + 1;                // 1–12
    const specific = getSpecificTimezone(lat, lng, month);
    if (specific !== null) return specific;
  
    // Fallback: longitudinal slice 15° per zone
    let offset = Math.round(lng / 15);
    if (isDaylightSavingTime(lat, month)) offset += 1;
    return Math.max(-12, Math.min(14, offset));
  }
  
  /* Synthetic rectangles for major political zones */
  export function getSpecificTimezone(lat, lng, month) {
    const dst = isDaylightSavingTime(lat, month);
  
    /* Central Europe */
    if (lat >= 45 && lat <= 55 && lng >= 12 && lng <= 19) return dst ? 2 : 1;
    /* UK, Ireland, Portugal */
    if (lat >= 50 && lat <= 60 && lng >= -10 && lng <= 2) return dst ? 1 : 0;
    /* Eastern Europe */
    if (lat >= 45 && lat <= 55 && lng >= 19 && lng <= 30) return dst ? 3 : 2;
    /* China */
    if (lat >= 20 && lat <= 50 && lng >= 75 && lng <= 135) return 8;
    /* India */
    if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) return 5.5;
    /* Japan */
    if (lat >= 30 && lat <= 46 && lng >= 130 && lng <= 146) return 9;
    /* Continental USA, four primary zones */
    if (lat >= 25 && lat <= 50 && lng >= -85 && lng <= -67)  return dst ? -4 : -5; // Eastern
    if (lat >= 25 && lat <= 50 && lng >= -105 && lng <= -85) return dst ? -5 : -6; // Central
    if (lat >= 25 && lat <= 50 && lng >= -115 && lng <= -105)return dst ? -6 : -7; // Mountain
    if (lat >= 25 && lat <= 50 && lng >= -125 && lng <= -115)return dst ? -7 : -8; // Pacific
  
    return null;
  }
  
  /**
   * Extremely simplified DST rule:
   *   – Northern hemisphere: April – October inclusive  
   *   – Southern hemisphere: October – April inclusive
   */
  export function isDaylightSavingTime(lat, month) {
    if (lat >= 0) return month >= 4 && month <= 10;
    return month <= 4 || month >= 10;
  }
  