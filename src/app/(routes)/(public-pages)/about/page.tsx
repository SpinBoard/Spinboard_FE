import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import {
  Users,
  Target,
  Video,
  Globe,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Mail,
  Sparkles,
} from "lucide-react";

// RESTYLE (design/DECISIONS.md #25) — same layout, same copy, same
// (placeholder, pre-launch) stat numbers; only the styling moved off the
// old shadcn theme classes and GradientButton's hardcoded gradients onto
// tokens.css and the Freebiz Button/Card primitives.
export default function AboutPage() {
  const stats = [
    { label: "Active Viewers", value: "10,000+", icon: Users },
    { label: "Ads Watched", value: "500,000+", icon: Video },
    { label: "Campaigns Launched", value: "1,200+", icon: Target },
    { label: "Countries", value: "15+", icon: Globe },
  ];

  const values = [
    {
      icon: Video,
      title: "Attention-First",
      description:
        "We believe ads should earn attention, not steal it. The billboard plays continuously — no gate, no quiz.",
    },
    {
      icon: Shield,
      title: "Fair Rewards",
      description:
        "First to type a live freebie code wins it, every time. Transparent, first-come mechanics, nothing hidden.",
    },
    {
      icon: TrendingUp,
      title: "Mutual Growth",
      description:
        "We foster growth for brands seeking real engagement and viewers looking to earn through their attention.",
    },
    {
      icon: Zap,
      title: "Innovation-Driven",
      description:
        "We're constantly refining the billboard and freebie-code strip to make it faster, fairer, and more rewarding.",
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-10">
        {/* Hero Section */}
        <section className="py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1
              className="text-4xl sm:text-5xl font-bold mb-6"
              style={{ fontFamily: "var(--display)", color: "var(--txt)" }}>
              Turning attention into
              <span style={{ color: "var(--free)" }}> real rewards</span>
            </h1>
            <p
              className="text-lg sm:text-xl mb-8 max-w-3xl mx-auto px-4"
              style={{ color: "var(--muted)" }}>
              Freebiz connects brands with real, engaged viewers. Brand ads play
              continuously on the billboard — no gate, no quiz — and freebie
              codes for real cash pop up on the strip for the first viewer to
              type them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Link href={routes.WATCH}>
                <Button
                  variant="primary"
                  className="w-full sm:w-auto justify-center">
                  Start watching <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`${routes.REGISTER}?type=brand`}>
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto justify-center">
                  Create a campaign
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="text-center">
                  <Icon
                    className="h-8 w-8 mx-auto mb-4"
                    style={{ color: "var(--free)" }}
                  />
                  <div
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{
                      fontFamily: "var(--display)",
                      color: "var(--txt)",
                    }}>
                    {stat.value}
                  </div>
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    {stat.label}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center px-4">
            <div>
              <h2
                className="text-3xl font-bold mb-6"
                style={{ fontFamily: "var(--display)", color: "var(--txt)" }}>
                Our mission
              </h2>
              <p className="text-lg mb-6" style={{ color: "var(--muted)" }}>
                We&apos;re on a mission to make advertising something people
                actually want to engage with — creating meaningful connections
                between brands and viewers while providing fair earning
                opportunities.
              </p>
              <p className="text-lg mb-8" style={{ color: "var(--muted)" }}>
                Traditional advertising interrupts and annoys. We believe it
                should be engaging, rewarding, and fast. Our platform creates a
                win-win: brands get real attention and measurable engagement,
                and viewers earn money for the time they give.
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: "Genuine Engagement",
                    desc: "Racing to catch a live freebie code is a real interaction, not a passive skip-through",
                  },
                  {
                    title: "Fair Rewards",
                    desc: "First-to-type wins it, and nothing you win ever expires",
                  },
                  {
                    title: "Authentic Connections",
                    desc: "Help brands build genuine relationships with their target audience",
                  },
                ].map((item) => (
                  <div className="flex items-start" key={item.title}>
                    <div
                      className="w-2 h-2 rounded-full mt-3 mr-4"
                      style={{ background: "var(--free)" }}></div>
                    <div>
                      <h4
                        className="font-semibold"
                        style={{ color: "var(--txt)" }}>
                        {item.title}
                      </h4>
                      <p style={{ color: "var(--muted)" }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Card className="p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: "var(--accent-soft)" }}>
                    <Sparkles
                      className="h-12 w-12"
                      style={{ color: "var(--free)" }}
                    />
                  </div>
                  <h3
                    className="text-2xl font-bold mb-4"
                    style={{
                      fontFamily: "var(--display)",
                      color: "var(--txt)",
                    }}>
                    Watch. Catch a code. Get paid.
                  </h3>
                  <p style={{ color: "var(--muted)" }}>
                    Our platform turns brand videos into a continuous stream
                    viewers actually want to stick around for.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-10">
          <div className="px-4">
            <div className="text-center mb-12">
              <h2
                className="text-3xl font-bold mb-4"
                style={{ fontFamily: "var(--display)", color: "var(--txt)" }}>
                Our values
              </h2>
              <p
                className="text-lg max-w-2xl mx-auto"
                style={{ color: "var(--muted)" }}>
                The principles that guide everything we do and every decision we
                make
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card key={index} className="text-center h-full">
                    <Icon
                      className="h-10 w-10 mx-auto mb-4"
                      style={{ color: "var(--free)" }}
                    />
                    <h3
                      className="text-lg font-semibold mb-3"
                      style={{ color: "var(--txt)" }}>
                      {value.title}
                    </h3>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {value.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <Card
            className="mx-4"
            style={{
              background:
                "linear-gradient(135deg, var(--free), rgba(255,210,63,.55))",
            }}>
            <div
              className="p-8 sm:p-12 text-center"
              style={{ color: "var(--ink-900)" }}>
              <h2
                className="text-3xl font-bold mb-4"
                style={{ fontFamily: "var(--display)" }}>
                Join Freebiz
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Whether you want to earn money watching ads or create engaging
                campaigns for your brand, we&apos;d love to have you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={routes.WATCH}>
                  <Button
                    className="w-full sm:w-auto justify-center"
                    style={{
                      background: "var(--ink-900)",
                      color: "var(--txt)",
                    }}>
                    Start watching
                  </Button>
                </Link>
                <Link href={`${routes.REGISTER}?type=brand`}>
                  <Button
                    variant="ghost"
                    className="w-full sm:w-auto justify-center"
                    style={{
                      borderColor: "var(--ink-900)",
                      color: "var(--ink-900)",
                    }}>
                    Create brand campaigns
                  </Button>
                </Link>
              </div>
              <div
                className="mt-8 pt-8"
                style={{ borderTop: "1px solid rgba(14,12,22,.2)" }}>
                <p className="mb-4 opacity-90">
                  Have questions? We&apos;d love to hear from you.
                </p>
                <a
                  href="mailto:hello@freebiz.com"
                  className="inline-flex items-center hover:opacity-80 transition-opacity">
                  <Mail className="h-4 w-4 mr-2" />
                  hello@freebiz.com
                </a>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
}
