import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata = {
  title: "HKS Research Data Lakehouse",
  description: "Pipeline Ingestion & Anomaly Detection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen p-8 text-gray-900 font-sans">
        <div className="max-w-5xl mx-auto">
          <header className="mb-6">
            <h1 className="text-3xl font-bold">HKS Data Lakehouse</h1>
            <p className="text-gray-500 mt-1">Pipeline Ingestion & Anomaly Detection</p>
          </header>
          
          <Navigation />
          
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}