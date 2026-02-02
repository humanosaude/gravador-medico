'use client';

import AudienceTable from '@/components/ads/AudienceTable';

export default function AudiencesPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎯 Gestão de Públicos
          </h1>
          <p className="text-gray-400">
            Visualize e gerencie seus Custom Audiences e Lookalikes da Meta
          </p>
        </div>

        {/* Audience Table */}
        <AudienceTable />

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-white font-semibold mb-2">🔵 Custom Audiences</h3>
            <p className="text-gray-400 text-sm">
              Públicos personalizados baseados em listas de clientes, visitantes do site ou engajamento com suas páginas.
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-white font-semibold mb-2">🟣 Lookalikes</h3>
            <p className="text-gray-400 text-sm">
              Públicos semelhantes criados pela Meta. Quanto menor a %, mais similar ao público original (1-10%).
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-white font-semibold mb-2">⚠️ Status &quot;Preenchendo&quot;</h3>
            <p className="text-gray-400 text-sm">
              Públicos novos levam 24-48h para ficarem prontos. Evite usar antes de ter pelo menos 1.000 pessoas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
