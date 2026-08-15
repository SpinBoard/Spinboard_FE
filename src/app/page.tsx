"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { routes } from "@/app/_utils/routes";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroBillboard } from "@/components/marketing/hero-billboard";
import { PlayCircle, Video, Target } from "lucide-react";

export default function Home() {
  const [activeAudience, setActiveAudience] = useState<"viewers" | "brands">("viewers");

  return (
    <div className="min-h-screen bg-background text-white overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-[5%] pt-32 pb-12 relative z-10">
        <div className="max-w-[75rem] grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight font-sora">
              A billboard that
              <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                pays you back.
              </span>
            </h1>
            <p className="text-xl text-white/70 mb-8 leading-relaxed">
              Brand video ads play continuously — no gate, no quiz. Freebie codes for real cash
              and airtime pop up on the strip; first to type one wins it.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link href={routes.WATCH}>
                <GradientButton variant="secondary" className="px-7 py-6 text-base hover:-translate-y-1">
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Start Watching
                </GradientButton>
              </Link>
              <Link href={`${routes.REGISTER}?type=brand`}>
                <GradientButton className="px-7 py-6 text-base hover:-translate-y-1">
                  I&apos;m a Brand
                </GradientButton>
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <HeroBillboard />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-primary/10 border-t border-primary/30 border-b py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-[5%]">
          <div className="flex justify-around text-center flex-wrap gap-8">
            <div>
              <h3 className="text-5xl font-bold text-primary mb-2 font-sora">500+</h3>
              <p className="text-white/60">Active Brands</p>
            </div>
            <div>
              <h3 className="text-5xl font-bold text-secondary mb-2 font-sora">2M+</h3>
              <p className="text-white/60">Ads Watched</p>
            </div>
            <div>
              <h3 className="text-5xl font-bold text-success mb-2 font-sora">₦850M+</h3>
              <p className="text-white/60">Paid to Viewers</p>
            </div>
            <div>
              <h3 className="text-5xl font-bold text-primary mb-2 font-sora">150K+</h3>
              <p className="text-white/60">Active Viewers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Section with Toggle */}
      <section className="py-20 px-[5%] relative z-10" id="for-players">
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
          <button
            onClick={() => setActiveAudience("viewers")}
            className={`px-8 py-4 sm:px-12 sm:py-5 rounded-full text-lg font-semibold transition-all duration-300 font-sora ${
              activeAudience === "viewers"
                ? "bg-secondary text-secondary-foreground shadow-lg"
                : "border-2 border-white/20 text-white/60 hover:border-secondary hover:text-secondary"
            }`}>
            <Video className="inline mr-2" size={20} />
            I&apos;m a Viewer
          </button>
          <button
            onClick={() => setActiveAudience("brands")}
            className={`px-8 py-4 sm:px-12 sm:py-5 rounded-full text-lg font-semibold transition-all duration-300 font-sora ${
              activeAudience === "brands"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "border-2 border-white/20 text-white/60 hover:border-primary hover:text-primary"
            }`}>
            <Target className="inline mr-2" size={20} />
            I&apos;m a Brand
          </button>
        </div>

        {/* Viewers Content */}
        {activeAudience === "viewers" && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-[2.5rem] font-bold text-center mb-12 font-sora">
              Watch. Catch a Code. <span className="text-success">Get Paid.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { num: "1", title: "Start Watching", desc: "No account needed — jump straight into the billboard, no gate." },
                { num: "2", title: "Watch the Strip", desc: "Freebie codes for cash and airtime appear on the perimeter." },
                { num: "3", title: "Be First to Type It", desc: "One Apply box claims the code the moment it goes live." },
                { num: "4", title: "Get Paid Weekly", desc: "Cash redeems straight to your wallet; airtime reveals a PIN instantly." },
              ].map((step, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center transition-all duration-300 hover:-translate-y-3 hover:border-secondary hover:shadow-lg hover:shadow-secondary/20">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 font-bold text-lg bg-secondary text-secondary-foreground">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-sora">{step.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-success/10 to-secondary/10 rounded-[30px] p-12 border border-success/30">
              <h3 className="text-3xl font-bold text-center mb-8 font-sora">
                Ways to <span className="text-success">Earn</span>
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: "trophy-flat-icon.png", title: "Freebie Codes", desc: "Cash and airtime codes pop up on the strip — first to type wins." },
                  { icon: "flash-flat-icon.png", title: "Nothing Ever Expires", desc: "A code you win stays claimable forever — no deadline, no rush." },
                  { icon: "money-flat-icon.png", title: "Referral Program", desc: "Qualified referrals earn you a flat wallet-cash credit." },
                ].map((earning, index) => (
                  <div
                    key={index}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-3 hover:border-secondary hover:shadow-lg hover:shadow-secondary/20">
                    <div className="mb-4 flex justify-center">
                      <Image src={`/icons/${earning.icon}`} alt="" width={48} height={48} />
                    </div>
                    <h4 className="text-xl font-bold text-success mb-2 font-sora">{earning.title}</h4>
                    <p className="text-white/60 text-sm">{earning.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Brands Content */}
        {activeAudience === "brands" && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-[2.5rem] font-bold text-center mb-12 font-sora">
              Turn Attention Into <span className="text-primary">Action</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { num: "1", title: "Upload Your Ad", desc: "A short video — that's the whole campaign, no quiz to build." },
                { num: "2", title: "Pick a Tier", desc: "Flat $20 Basic or $30 Premium — 30-day activation, Premium unlocks analytics." },
                { num: "3", title: "Track Performance", desc: "Views, verified completions, and a demographic breakdown, live." },
              ].map((step, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center transition-all duration-300 hover:-translate-y-3 hover:border-primary hover:shadow-lg hover:shadow-primary/20">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-5 font-bold text-lg text-primary-foreground">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-sora">{step.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="py-24 bg-gradient-to-b from-transparent to-primary/10 relative z-10" id="features">
        <h2 className="text-[2.5rem] font-bold text-center mb-16 max-w-4xl mx-auto px-[5%] font-sora">
          Why Everyone <span className="text-primary">Loves</span> Pazzell
        </h2>
        <div className="max-w-7xl mx-auto px-[5%] grid md:grid-cols-2 gap-8">
          {[
            { icon: "money-flat-icon.png", title: "Real Rewards, Weekly Payouts", desc: "Redeemed cash lands in your wallet and pays out in the weekly run." },
            { icon: "chart-flat-icon.png", title: "Real Tier Analytics", desc: "Premium brands see views, completions, and a demographic breakdown live." },
            { icon: "target-flat-icon.png", title: "Genuine Engagement", desc: "First-to-type freebie codes reward attention, not passive skip-through." },
            { icon: "mobile-flat-icon.png", title: "Mobile-First", desc: "The billboard, strip, and Apply box are all built to feel great on any screen." },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 flex gap-6 items-start transition-all duration-300 hover:bg-white/8 hover:border-secondary">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 p-2 bg-secondary">
                <Image src={`/icons/${feature.icon}`} alt="" width={32} height={32} className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 font-sora">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dual CTA */}
      <section className="py-24 px-[5%] relative z-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-primary to-primary/70 rounded-[30px] p-12 text-center relative overflow-hidden">
            <h2 className="text-3xl font-bold mb-4 font-sora">Ready to Reach Real Viewers?</h2>
            <p className="text-lg opacity-90 mb-6">
              Join 500+ brands turning attention into engaged customers.
            </p>
            <Link href={`${routes.REGISTER}?type=brand`}>
              <Button className="bg-[#FFFFFF] text-primary hover:bg-[#FFFFFF]/90 font-bold py-4 px-8 md:py-6 md:px-12 rounded-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-lg font-sora">
                Create a Campaign
              </Button>
            </Link>
          </div>
          <div className="bg-gradient-to-br from-secondary to-success rounded-[30px] p-12 text-center relative overflow-hidden text-secondary-foreground">
            <h2 className="text-3xl font-bold mb-4 font-sora">Ready to Watch & Earn?</h2>
            <p className="text-lg opacity-90 mb-6">
              Join 150K+ viewers making money while watching ads.
            </p>
            <Link href={routes.WATCH}>
              <Button className="bg-[#FFFFFF] text-secondary-foreground hover:bg-[#FFFFFF]/90 font-bold py-4 px-8 md:py-6 md:px-12 rounded-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-lg font-sora">
                Start Watching Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
