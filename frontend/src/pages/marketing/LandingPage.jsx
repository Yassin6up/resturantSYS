import { Link } from 'react-router-dom';
import { UtensilsCrossed, ShoppingBag, CalendarCheck, Check, ArrowRight, MessageCircle, Gift, Palette } from 'lucide-react';

const VERTICALS = [
  {
    icon: UtensilsCrossed,
    title: 'Restaurants',
    desc: 'QR-code menus, table ordering, kitchen display, POS, and delivery-ready receipts.',
  },
  {
    icon: ShoppingBag,
    title: 'Online Stores',
    desc: 'A full product catalog and checkout for shops that just want to sell online.',
  },
  {
    icon: CalendarCheck,
    title: 'Appointments & Bookings',
    desc: 'Clinics, salons, hotels, and offices — customers pick a service and a time slot themselves.',
  },
];

const FEATURES = [
  { icon: Palette, title: 'Your own subdomain', desc: 'yourbusiness.ourplatform.com, live the moment you sign up.' },
  { icon: Gift, title: 'Customer accounts & loyalty', desc: 'Every customer can create an account and earn points on repeat visits.' },
  { icon: MessageCircle, title: 'WhatsApp marketing', desc: 'Scan a QR code to connect your own WhatsApp and message your customer list.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-xl font-bold">POSQ</span>
          <div className="flex items-center gap-4">
            <a href="/admin/login" className="text-slate-600 hover:text-slate-900 text-sm font-medium">Log in</a>
            <Link to="/get-started" className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          One platform. <span className="text-blue-600">Any kind of business.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Create a restaurant, an online store, or an appointments-based business in minutes.
          Every store gets its own subdomain, a real dashboard, and customer accounts with loyalty points from day one.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/get-started" className="flex items-center gap-2 bg-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/25">
            Create your store <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-center text-2xl font-bold mb-10">Built for more than one kind of business</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {VERTICALS.map(v => (
            <div key={v.title} className="border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <v.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
              <p className="text-slate-600 text-sm">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-2xl font-bold mb-10">Everything comes standard</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map(f => (
              <div key={f.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-white shadow flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-slate-600 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to launch your store?</h2>
        <p className="text-slate-600 mb-8">No credit card required to get started. Pick a plan later, once you're ready to go live.</p>
        <Link to="/get-started" className="inline-flex items-center gap-2 bg-slate-900 text-white font-medium px-6 py-3 rounded-xl hover:bg-slate-800">
          Create your account <ArrowRight className="w-4 h-4" />
        </Link>
        <ul className="mt-8 flex flex-col md:flex-row items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-500">
          <li className="flex items-center gap-1"><Check className="w-4 h-4 text-green-600" /> Free to start</li>
          <li className="flex items-center gap-1"><Check className="w-4 h-4 text-green-600" /> Live in minutes</li>
          <li className="flex items-center gap-1"><Check className="w-4 h-4 text-green-600" /> Your own subdomain</li>
        </ul>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} POSQ. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
