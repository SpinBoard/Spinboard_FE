"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/freebiz-button";
import { Card } from "@/components/ui/freebiz-card";
import { routes } from "@/app/_utils/routes";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroBillboard } from "@/components/marketing/hero-billboard";
import { PlayCircle, Video, Target } from "lucide-react";

// RESTYLE (design/DECISIONS.md #24) — "Apply the design system now; the
// launch copy from freebiz-marketing-kit.html goes in during the
// first-100 campaign, not during the redesign." So every string, every
// stat number and the whole section layout below are unchanged — only the
// styling moved from the old shadcn theme classes and a few literal hex
// values (bg-[#FFFFFF], GradientButton's hardcoded gradients) onto
// tokens.css and the Freebiz Button/Card primitives. Header, Footer and
// HeroBillboard are shared across every public page and are a bigger,
// separate restyle of their own — left untouched here.
export default function Home() {
  const [activeAudience, setActiveAudience] = useState<"viewers" | "brands">(
    "viewers"
  );

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--ink-900)", color: "var(--txt)" }}>
      <Header />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-[5%] pt-24 pb-12 relative z-10">
        <div className="max-w-[75rem] grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <h1
              className="text-5xl lg:text-6xl font-bold mb-6 leading-tight"
              style={{ fontFamily: "var(--display)" }}>
              A billboard that
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg, var(--free), var(--brand))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}>
                pays you back.
              </span>
            </h1>
            <p
              className="text-xl mb-8 leading-relaxed"
              style={{ color: "var(--muted)" }}>
              Brand video ads play continuously — freebie codes for real cash
              pop up on the strip and the screen. First to type one wins it.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link href={routes.WATCH}>
                <Button variant="primary" className="px-7 py-3.5 text-base">
                  <PlayCircle className="h-5 w-5" />
                  Start watching
                </Button>
              </Link>
              <Link href={`${routes.REGISTER}?type=brand`}>
                <Button variant="ghost" className="px-7 py-3.5 text-base">
                  I&apos;m a brand
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <HeroBillboard />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section
        className="py-12 relative z-10"
        style={{
          background: "var(--accent-soft)",
          borderTop: "1px solid var(--line-2)",
          borderBottom: "1px solid var(--line-2)",
        }}>
        <div className="max-w-7xl mx-auto px-[5%]">
          <div className="flex justify-around text-center flex-wrap gap-8">
            <div>
              <h3
                className="text-5xl font-bold mb-2"
                style={{ fontFamily: "var(--display)", color: "var(--free)" }}>
                500+
              </h3>
              <p style={{ color: "var(--muted)" }}>Active Brands</p>
            </div>
            <div>
              <h3
                className="text-5xl font-bold mb-2"
                style={{ fontFamily: "var(--display)", color: "var(--brand)" }}>
                2M+
              </h3>
              <p style={{ color: "var(--muted)" }}>Ads Watched</p>
            </div>
            <div>
              <h3
                className="text-5xl font-bold mb-2"
                style={{ fontFamily: "var(--display)", color: "var(--live)" }}>
                ₦850M+
              </h3>
              <p style={{ color: "var(--muted)" }}>Paid to Viewers</p>
            </div>
            <div>
              <h3
                className="text-5xl font-bold mb-2"
                style={{ fontFamily: "var(--display)", color: "var(--free)" }}>
                150K+
              </h3>
              <p style={{ color: "var(--muted)" }}>Active Viewers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Section with Toggle */}
      <section className="py-20 px-[5%] relative z-10" id="for-viewers">
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
          <button
            onClick={() => setActiveAudience("viewers")}
            className="px-8 py-4 sm:px-12 sm:py-5 rounded-full text-lg font-semibold transition-all duration-300"
            style={
              activeAudience === "viewers"
                ? {
                    fontFamily: "var(--display)",
                    background: "var(--live)",
                    color: "var(--ink-900)",
                  }
                : {
                    fontFamily: "var(--display)",
                    border: "2px solid var(--line-2)",
                    color: "var(--muted)",
                  }
            }>
            <Video className="inline mr-2" size={20} />
            I&apos;m a viewer
          </button>
          <button
            onClick={() => setActiveAudience("brands")}
            className="px-8 py-4 sm:px-12 sm:py-5 rounded-full text-lg font-semibold transition-all duration-300"
            style={
              activeAudience === "brands"
                ? {
                    fontFamily: "var(--display)",
                    background: "var(--brand)",
                    color: "var(--txt)",
                  }
                : {
                    fontFamily: "var(--display)",
                    border: "2px solid var(--line-2)",
                    color: "var(--muted)",
                  }
            }>
            <Target className="inline mr-2" size={20} />
            I&apos;m a brand
          </button>
        </div>

        {/* Viewers Content */}
        {activeAudience === "viewers" && (
          <div className="max-w-6xl mx-auto">
            <h2
              className="text-[2.5rem] font-bold text-center mb-12"
              style={{ fontFamily: "var(--display)" }}>
              Watch. Catch a code.{" "}
              <span style={{ color: "var(--live)" }}>Get paid.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                {
                  num: "1",
                  title: "Start Watching",
                  desc: "No account needed — jump straight into the billboard, no gate.",
                },
                {
                  num: "2",
                  title: "Watch the Strip",
                  desc: "Watch the strip or the billboard for freebie codes to win instant prizes.",
                },
                {
                  num: "3",
                  title: "Be First to Type It",
                  desc: "One Apply box claims the code the moment it goes live.",
                },
                {
                  num: "4",
                  title: "Get Paid Weekly",
                  desc: "Cash redeems straight to your wallet.",
                },
              ].map((step, index) => (
                <Card
                  key={index}
                  className="text-center transition-all duration-300 hover:-translate-y-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 font-bold text-lg"
                    style={{
                      background: "var(--live)",
                      color: "var(--ink-900)",
                    }}>
                    {step.num}
                  </div>
                  <h3
                    className="text-xl font-bold mb-3"
                    style={{ fontFamily: "var(--display)" }}>
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--muted)" }}>
                    {step.desc}
                  </p>
                </Card>
              ))}
            </div>

            <div
              className="rounded-[30px] p-12"
              style={{
                background:
                  "linear-gradient(135deg, rgba(61,220,151,.1), rgba(61,220,151,.03))",
                border: "1px solid rgba(61,220,151,.3)",
              }}>
              <h3
                className="text-3xl font-bold text-center mb-8"
                style={{ fontFamily: "var(--display)" }}>
                Ways to <span style={{ color: "var(--live)" }}>earn</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: "trophy-flat-icon.png",
                    title: "Freebie Codes",
                    desc: "Cash codes pop up on the strip — first to type wins.",
                  },
                  {
                    icon: "crown-icon.png",
                    title: "Promote & Earn",
                    desc: "Share a brand's campaign, rack up likes, and climb the leaderboard for a shot at the prize.",
                  },
                ].map((earning, index) => (
                  <Card
                    key={index}
                    className="text-center transition-all duration-300 hover:-translate-y-2">
                    <div className="mb-4 flex justify-center">
                      <Image
                        src={`/icons/${earning.icon}`}
                        alt=""
                        width={48}
                        height={48}
                      />
                    </div>
                    <h4
                      className="text-xl font-bold mb-2"
                      style={{
                        fontFamily: "var(--display)",
                        color: "var(--live)",
                      }}>
                      {earning.title}
                    </h4>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {earning.desc}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Brands Content */}
        {activeAudience === "brands" && (
          <div className="max-w-6xl mx-auto">
            <h2
              className="text-[2.5rem] font-bold text-center mb-12"
              style={{ fontFamily: "var(--display)" }}>
              Turn attention into{" "}
              <span style={{ color: "var(--brand)" }}>action</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  num: "1",
                  title: "Upload Your Ad",
                  desc: "A short video — that's the whole campaign, no quiz to build.",
                },
                {
                  num: "2",
                  title: "Pick a Tier",
                  desc: "Flat $20 Basic or $30 Premium — 30-day activation, Premium unlocks analytics.",
                },
                {
                  num: "3",
                  title: "Track Performance",
                  desc: "Views, verified completions, and a demographic breakdown, live.",
                },
              ].map((step, index) => (
                <Card
                  key={index}
                  className="text-center transition-all duration-300 hover:-translate-y-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 font-bold text-lg"
                    style={{ background: "var(--brand)", color: "var(--txt)" }}>
                    {step.num}
                  </div>
                  <h3
                    className="text-xl font-bold mb-3"
                    style={{ fontFamily: "var(--display)" }}>
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--muted)" }}>
                    {step.desc}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section
        className="py-24 relative z-10"
        id="features"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--accent-soft))",
        }}>
        <h2
          className="text-[2.5rem] font-bold text-center mb-16 max-w-4xl mx-auto px-[5%]"
          style={{ fontFamily: "var(--display)" }}>
          Why everyone <span style={{ color: "var(--free)" }}>loves</span>{" "}
          Freebiz
        </h2>
        <div className="max-w-7xl mx-auto px-[5%] grid md:grid-cols-2 gap-8">
          {[
            {
              icon: "money-flat-icon.png",
              title: "Real Rewards, Weekly Payouts",
              desc: "Redeemed cash lands in your wallet and pays out in the weekly run.",
            },
            {
              icon: "chart-flat-icon.png",
              title: "Real Tier Analytics",
              desc: "Premium brands see views, completions, and a demographic breakdown live.",
            },
            {
              icon: "target-flat-icon.png",
              title: "Genuine Engagement",
              desc: "First-to-type freebie codes reward attention, not passive skip-through.",
            },
            {
              icon: "star-icon.png",
              title: "Discover Real Businesses",
              desc: "Browse the Brands directory and connect directly — a call, message, or DM away, no checkout in between.",
            },
          ].map((feature, index) => (
            <Card
              key={index}
              className="flex gap-6 items-start transition-all duration-300">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 p-2"
                style={{ background: "var(--free)" }}>
                <Image
                  src={`/icons/${feature.icon}`}
                  alt=""
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ fontFamily: "var(--display)" }}>
                  {feature.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--muted)" }}>
                  {feature.desc}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Dual CTA */}
      <section className="py-24 px-[5%] relative z-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <div
            className="rounded-[30px] p-12 text-center relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--brand), rgba(124,92,255,.6))",
            }}>
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "var(--display)" }}>
              Ready to reach real viewers?
            </h2>
            <p className="text-lg opacity-90 mb-6">
              Join 500+ brands turning attention into engaged customers.
            </p>
            <Link href={`${routes.REGISTER}?type=brand`}>
              <Button
                className="py-4 px-8 md:py-5 md:px-10 text-lg"
                style={{ background: "var(--txt)", color: "var(--ink-900)" }}>
                Create a campaign
              </Button>
            </Link>
          </div>
          <div
            className="rounded-[30px] p-12 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--live), var(--free))",
              color: "var(--ink-900)",
            }}>
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "var(--display)" }}>
              Ready to watch &amp; earn?
            </h2>
            <p className="text-lg opacity-90 mb-6">
              Join 150K+ viewers making money while watching ads.
            </p>
            <Link href={routes.WATCH}>
              <Button
                className="py-4 px-8 md:py-5 md:px-10 text-lg"
                style={{ background: "var(--ink-900)", color: "var(--txt)" }}>
                Start watching now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
