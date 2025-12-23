import prisma from '@/lib/prisma';

export async function getServerSidePropsForPnlPage(context: any) {
  try {
    // Fetch all hotels
    const hotels = await prisma.hotelProperty.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    const initialHotelId = context.query.hotelId ? parseInt(context.query.hotelId as string) : null;
    const initialYear = context.query.year ? parseInt(context.query.year as string) : new Date().getFullYear();

    return {
      props: {
        hotels,
        initialHotelId,
        initialYear,
      },
    };
  } catch (err) {
    console.error('Error loading hotels:', err);
    return {
      props: {
        hotels: [],
        initialHotelId: null,
        initialYear: new Date().getFullYear(),
      },
    };
  }
}
