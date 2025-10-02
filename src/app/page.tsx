import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-6xl font-bold text-center mb-8">
          NOION Analytics
        </h1>
        <p className="text-xl text-center mb-8">
          AI-Powered Restaurant Intelligence Platform
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Pulse Tier</h2>
            <p className="text-lg mb-2">$29-99/month</p>
            <p>Basic insights and lead generation</p>
          </div>

          <div className="p-6 border rounded-lg bg-blue-50 dark:bg-blue-900">
            <h2 className="text-2xl font-bold mb-4">Intelligence Tier</h2>
            <p className="text-lg mb-2">$299-799/month</p>
            <p>Comprehensive analytics and insights</p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Command Tier</h2>
            <p className="text-lg mb-2">$2,500-10K/month</p>
            <p>Enterprise multi-location solutions</p>
          </div>
        </div>

        <div className="mt-12 text-center space-x-4">
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/pos"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            Connect POS
          </Link>
        </div>
      </div>
    </main>
  )
}
