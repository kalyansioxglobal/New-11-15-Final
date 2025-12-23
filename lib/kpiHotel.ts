// lib/kpiHotel.ts
import prisma from "./prisma";

export type HotelKpiDailyLike = {
  roomsAvailable: number;
  roomsSold: number;
  roomRevenue: number;
};

export type HotelKpiInput = {
  ventureId: number;
  hotelId: number;
  date: Date;
  roomsAvailable?: number;
  roomsSold?: number;
  roomRevenue?: number;
  otherRevenue?: number;
  totalRevenue?: number;
  occupancyPct?: number;
  adr?: number;
  revpar?: number;
  roomsOutOfOrder?: number;
};

export async function upsertHotelKpiDaily(
  input: HotelKpiInput
): Promise<HotelKpiDailyLike> {
  const {
    ventureId,
    hotelId,
    date,
    roomsAvailable = 0,
    roomsSold = 0,
    roomRevenue = 0,
    otherRevenue = 0,
    totalRevenue,
    occupancyPct,
    adr,
    revpar,
    roomsOutOfOrder = 0,
  } = input;

  const total =
    typeof totalRevenue === "number"
      ? totalRevenue
      : roomRevenue + otherRevenue;

  const occ =
    typeof occupancyPct === "number"
      ? occupancyPct
      : roomsAvailable > 0
      ? (roomsSold / roomsAvailable) * 100
      : 0;

  const avgDailyRate =
    typeof adr === "number"
      ? adr
      : roomsSold > 0
      ? roomRevenue / roomsSold
      : 0;

  const revPar =
    typeof revpar === "number"
      ? revpar
      : roomsAvailable > 0
      ? roomRevenue / roomsAvailable
      : 0;

  return prisma.hotelKpiDaily.upsert({
    where: {
      hotelId_date: {
        hotelId,
        date,
      },
    },
    update: {
      ventureId,
      roomsAvailable,
      roomsSold,
      roomRevenue,
      otherRevenue,
      totalRevenue: total,
      occupancyPct: occ,
      adr: avgDailyRate,
      revpar: revPar,
      roomsOutOfOrder,
    },
    create: {
      ventureId,
      hotelId,
      date,
      roomsAvailable,
      roomsSold,
      roomRevenue,
      otherRevenue,
      totalRevenue: total,
      occupancyPct: occ,
      adr: avgDailyRate,
      revpar: revPar,
      roomsOutOfOrder,
    },
  });
}

export function summarizeHotelKpis(rows: HotelKpiDailyLike[]) {
  let totalRoomsAvailable = 0;
  let totalRoomsSold = 0;
  let totalRoomRevenue = 0;

  for (const r of rows) {
    totalRoomsAvailable += r.roomsAvailable;
    totalRoomsSold += r.roomsSold;
    totalRoomRevenue += r.roomRevenue;
  }

  const occupancyPct =
    totalRoomsAvailable > 0
      ? (totalRoomsSold / totalRoomsAvailable) * 100
      : 0;

  const adr =
    totalRoomsSold > 0
      ? totalRoomRevenue / totalRoomsSold
      : 0;

  const revpar =
    totalRoomsAvailable > 0
      ? totalRoomRevenue / totalRoomsAvailable
      : 0;

  return {
    totalRoomsAvailable,
    totalRoomsSold,
    occupancyPct,
    adr,
    revpar,
    totalRoomRevenue,
    lowOcc: occupancyPct < 60,
    lowRevpar: revpar < 50,
  };
}
