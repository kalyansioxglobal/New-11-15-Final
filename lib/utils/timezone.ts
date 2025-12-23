/**
 * Timezone Utilities
 * 
 * Simplified timezone handling for scheduled jobs.
 * Uses native Intl API for DST-aware timezone conversions.
 */

const TIMEZONE = "America/New_York";

/**
 * Get current time in New York timezone
 * 
 * @returns Object with hour, minute, and date string (YYYY-MM-DD)
 */
export function getNewYorkTime(): { hour: number; minute: number; dateStr: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  
  return { hour, minute, dateStr: `${year}-${month}-${day}` };
}

/**
 * Get next run time for a scheduled job in New York timezone
 * 
 * @param targetHour - Target hour (0-23)
 * @param targetMinute - Target minute (0-59)
 * @returns Date object representing the next run time in UTC
 */
export function getNextRunTime(targetHour: number, targetMinute: number): Date {
  const ny = getNewYorkTime();
  const currentMinutes = ny.hour * 60 + ny.minute;
  const targetMinutes = targetHour * 60 + targetMinute;

  let dateStr = ny.dateStr;
  
  // If target time has passed today, schedule for tomorrow
  if (targetMinutes <= currentMinutes) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = tomorrowFormatter.formatToParts(tomorrow);
    const year = parts.find((p) => p.type === "year")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "";
    dateStr = `${year}-${month}-${day}`;
  }

  // Create date string in ISO format for the target time in NY timezone
  const targetTimeStr = `${dateStr}T${targetHour.toString().padStart(2, "0")}:${targetMinute.toString().padStart(2, "0")}:00`;
  
  // Parse as if it's in NY timezone, then convert to UTC
  // Use Intl.DateTimeFormat to get the UTC equivalent
  const nyDate = new Date(targetTimeStr + '-05:00'); // EST offset (will be adjusted by DST)
  
  // More accurate: use Intl to format in NY timezone, then parse
  // This handles DST automatically
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Create a date object representing the target time in NY
  // We'll use a simpler approach: create date in UTC, then adjust
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, targetHour, targetMinute, 0));
  
  // Get the offset between UTC and NY timezone for this date
  // This automatically handles DST
  const nyString = formatter.format(utcDate);
  const utcString = new Date(utcDate).toLocaleString("en-US", { timeZone: "UTC" });
  
  // Calculate offset: if NY is behind UTC, we need to add hours
  // Use a more direct approach: create date in NY timezone
  const testDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}:00`);
  
  // Get what this time would be in NY timezone
  const nyTime = new Date(testDate.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const utcTime = new Date(testDate.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = utcTime.getTime() - nyTime.getTime();
  
  // Return UTC time that represents the target NY time
  return new Date(testDate.getTime() + offsetMs);
}

/**
 * Simplified version: just use the target time and let the system handle it
 * This is safer and simpler - the job runner will check if it's time to run
 */
export function getNextRunTimeSimple(targetHour: number, targetMinute: number): Date {
  const ny = getNewYorkTime();
  const currentMinutes = ny.hour * 60 + ny.minute;
  const targetMinutes = targetHour * 60 + targetMinute;

  let dateStr = ny.dateStr;
  
  if (targetMinutes <= currentMinutes) {
    // Schedule for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(tomorrow);
    dateStr = `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
  }

  // Parse the date string and create a date in NY timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create date in UTC, then convert to what it would be in NY
  // This is tricky - we need to work backwards
  // Instead, create a date string and parse it assuming NY timezone
  const dateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}:00`;
  
  // Use a library-free approach: create date and manually adjust
  // For now, use a simpler method: create in local time, then adjust
  const localDate = new Date(dateTimeStr);
  
  // Get the timezone offset for NY at this date
  // We'll use Intl to format the date in NY timezone and compare
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Format the UTC date in NY timezone to see what it becomes
  const nyFormatted = formatter.formatToParts(localDate);
  const nyHour = parseInt(nyFormatted.find((p) => p.type === "hour")?.value || "0", 10);
  const nyMinute = parseInt(nyFormatted.find((p) => p.type === "minute")?.value || "0", 10);
  
  // Calculate offset needed
  const targetTotalMinutes = targetHour * 60 + targetMinute;
  const actualTotalMinutes = nyHour * 60 + nyMinute;
  const offsetMinutes = targetTotalMinutes - actualTotalMinutes;
  
  // Adjust the date
  return new Date(localDate.getTime() + offsetMinutes * 60 * 1000);
}


