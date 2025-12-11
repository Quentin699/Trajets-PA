import Link from "next/link";
import { getPatientRoutes } from "@/lib/data";
import { Users, Calendar, ArrowRight, Activity, Map } from "lucide-react";

export default async function Home() {
  const routes = await getPatientRoutes();
  const totalPatients = routes.reduce((acc, route) => acc + route.patients.length, 0);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">

        {/* Hero / Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-heading">
              Bonjour, <span className="text-emerald-500">Docteur</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium">
              Voici votre planning de la semaine.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Patients</p>
                <p className="text-xl font-bold text-slate-800">{totalPatients}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Tournées</p>
                <p className="text-xl font-bold text-slate-800">{routes.length}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Calendar className="mr-2 text-emerald-500" />
            Vos Tournées
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <Link
                key={route.dayName}
                href={`/day/${encodeURIComponent(route.dayName)}`}
                className="group relative"
              >
                <div className="medical-card h-full p-6 relative overflow-hidden group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300">

                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-50 text-emerald-600 font-bold shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors text-lg">
                        {route.dayName.substring(0, 1)}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                        {route.patients.length} visites
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                      {route.dayName}
                    </h3>

                    <div className="flex items-center text-slate-500 text-sm mb-6">
                      <Map className="w-4 h-4 mr-1" />
                      <span>Optimisation disponible</span>
                    </div>

                    <div className="flex items-center text-emerald-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                      Voir le détail <ArrowRight className="ml-1 w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {routes.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-400 text-lg mb-4">Aucune tournée détectée.</p>
                <p className="text-sm text-slate-400">Vérifiez que le fichier Excel est bien dans le dossier /data</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
