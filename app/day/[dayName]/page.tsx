import { getPatientRoutes } from "@/lib/data";
import DayView from "@/components/DayView";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ dayName: string }>;
}

export default async function Page({ params }: PageProps) {
    const { dayName } = await params;
    const decodedDayName = decodeURIComponent(dayName);

    const routes = await getPatientRoutes();
    const route = routes.find(r => r.dayName === decodedDayName);

    if (!route) {
        notFound();
    }

    return <DayView initialRoute={route} />;
}

// Generate static params for all known days to speed up build/loading
export async function generateStaticParams() {
    const routes = await getPatientRoutes();
    return routes.map((route) => ({
        dayName: route.dayName,
    }));
}
