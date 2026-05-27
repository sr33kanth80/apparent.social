import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, Users, Rocket, CheckCircle2 } from 'lucide-react';

type TabType = 'analyse' | 'train' | 'testing' | 'deploy';

export const NewHeroSection = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('analyse');

  // Auto-cycle tabs every 4 seconds
  useEffect(() => {
    const tabs: TabType[] = ['analyse', 'train', 'testing', 'deploy'];
    const interval = setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = tabs.indexOf(current);
        const nextIndex = (currentIndex + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const renderOverlay = () => {
    switch (activeTab) {
      case 'analyse':
        return (
          <div className="absolute inset-0 flex items-center justify-center animate-fade-in-overlay">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slide-up-overlay">
              <h3 className="text-xl font-semibold mb-6">Build Your Proof Profile</h3>
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Founder Bio</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-purple-500"></div>
                  <span className="text-sm font-medium">Connect GitHub</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                  <span className="text-sm text-gray-500">List Past Products</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                  <span className="text-sm text-gray-500">Add Press & Signals</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'train':
        return (
          <div className="absolute inset-0 flex items-center justify-center animate-fade-in-overlay">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slide-up-overlay">
              <h3 className="text-xl font-semibold mb-6">AI Thesis Matching</h3>
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Comparing founder signals</span>
                  <span className="font-medium">67%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-[#dcefc7] h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold mb-1">127</div>
                  <div className="text-xs text-gray-600">VC Matches</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold mb-1">94%</div>
                  <div className="text-xs text-gray-600">Thesis Fit</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold mb-1">$2.5M</div>
                  <div className="text-xs text-gray-600">Avg Check Size</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold mb-1">18</div>
                  <div className="text-xs text-gray-600">Nearby VCs</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'testing':
        return (
          <div className="absolute inset-0 flex items-center justify-center animate-fade-in-overlay">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slide-up-overlay">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="text-xl font-semibold">Signal Review Complete</h3>
                  <p className="text-sm text-gray-600">Proof points verified</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Builder Profile</span>
                  <span className="text-sm text-green-600">100%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">GitHub Verified</span>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Launches Listed</span>
                  <span className="text-sm text-green-600">3 active</span>
                </div>
              </div>
              <div className="text-center text-sm text-gray-600">
                GitHub, products, and public signals are ready
              </div>
            </div>
          </div>
        );

      case 'deploy':
        return (
          <div className="absolute inset-0 flex items-center justify-center animate-fade-in-overlay">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slide-up-overlay">
              <h3 className="text-xl font-semibold mb-6">Ready to Meet Capital</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Profile optimized for VC discovery</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Investor thesis matching configured</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Meetups and nearby VCs unlocked</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Deal terms workspace prepared</span>
                </div>
              </div>
              <button className="w-full bg-black text-white py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">
                Go Live on Apparent
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <section className="px-6 pt-24 pb-32 max-w-7xl mx-auto text-center">
      {/* Main Heading */}
      <h1 className="text-6xl md:text-7xl lg:text-[80px] font-normal leading-[1.1] tracking-tight mb-5">
        Where <span className="text-[#02A070]">Builders</span> Ship<br />
        And <span className="text-[#42520d]">Capital</span> Finds Them
      </h1>

      {/* Subheading */}
      <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        A social capital network where builders prove what they have built, VCs share what they believe, and AI connects the right people through thesis-driven matching.
      </p>

      {/* CTA Buttons */}
      <div className="mb-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          onClick={() => navigate('/login?role=founder')}
          className="bg-[#dcefc7] text-black px-8 py-3 rounded-full text-base font-medium shadow-sm shadow-[#dcefc7]/40 transition-opacity hover:opacity-90"
        >
          Create Founder Profile
        </button>
        <button
          onClick={() => navigate('/login?role=investor')}
          className="bg-[#42520d] text-white px-8 py-3 rounded-full text-base font-medium shadow-sm shadow-[#42520d]/20 transition-opacity hover:opacity-90"
        >
          Create Investor Profile
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          {/* Mobile: 2x2 Grid */}
          <div className="grid grid-cols-2 gap-1 md:hidden">
            <button
              onClick={() => setActiveTab('analyse')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'analyse'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('train')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'train'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Match
            </button>
            <button
              onClick={() => setActiveTab('testing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'testing'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <Users className="w-4 h-4" />
              Review
            </button>
            <button
              onClick={() => setActiveTab('deploy')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'deploy'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <Rocket className="w-4 h-4" />
              Launch
            </button>
          </div>

          {/* Desktop: Row with Dividers */}
          <div className="hidden md:flex items-center">
            <button
              onClick={() => setActiveTab('analyse')}
              className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'analyse'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Profile
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1"></div>
            <button
              onClick={() => setActiveTab('train')}
              className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'train'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Match
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1"></div>
            <button
              onClick={() => setActiveTab('testing')}
              className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'testing'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <Users className="w-4 h-4" />
              Review
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1"></div>
            <button
              onClick={() => setActiveTab('deploy')}
              className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'deploy'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <Rocket className="w-4 h-4" />
              Launch
            </button>
          </div>
        </div>
      </div>

      {/* Video + Overlay Section */}
      <div className="relative rounded-3xl overflow-hidden h-[400px] md:h-[500px]">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_165750_358b1e72-c921-48b7-aaac-f200994f32fb.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {renderOverlay()}
      </div>
    </section>
  );
};
