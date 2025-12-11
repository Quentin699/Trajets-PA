export interface Patient {
    id: string;
    firstName?: string;
    lastName?: string;
    address: string;
    phone?: string;
    details?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}

export interface DayRoute {
    dayName: string;
    patients: Patient[];
}
