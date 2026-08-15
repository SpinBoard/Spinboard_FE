import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { GradientButton } from "@/components/ui/gradient-button";
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
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 font-sora">
              Turning Attention Into
              <span className="text-primary"> Real Rewards</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/70 mb-8 max-w-3xl mx-auto px-4">
              Pazzell connects brands with real, engaged viewers. Brand ads play continuously on
              the billboard — no gate, no quiz — and freebie codes for real cash and airtime pop
              up on the strip for the first viewer to type them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Link href={routes.WATCH}>
                <GradientButton size="lg" className="w-full sm:w-auto">
                  Start Watching <ArrowRight className="ml-2 h-4 w-4" />
                </GradientButton>
              </Link>
              <Link href={`${routes.REGISTER}?type=brand`}>
                <GradientButton variant="outline" size="lg" className="w-full sm:w-auto">
                  Create a Campaign
                </GradientButton>
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
                <Card key={index} className="bg-card/50 backdrop-blur-sm border-white/10 text-center">
                  <CardContent className="pt-6">
                    <Icon className="h-8 w-8 text-secondary mx-auto mb-4" />
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-2 font-sora">
                      {stat.value}
                    </div>
                    <div className="text-white/60 text-sm">{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center px-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6 font-sora">Our Mission</h2>
              <p className="text-lg text-white/70 mb-6">
                We&apos;re on a mission to make advertising something people actually want to
                engage with — creating meaningful connections between brands and viewers
                while providing fair earning opportunities.
              </p>
              <p className="text-lg text-white/70 mb-8">
                Traditional advertising interrupts and annoys. We believe it should be
                engaging, rewarding, and fast. Our platform creates a win-win: brands
                get real attention and measurable engagement, and viewers earn money for
                the time they give.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-3 mr-4"></div>
                  <div>
                    <h4 className="font-semibold text-white">Genuine Engagement</h4>
                    <p className="text-white/60">
                      Racing to catch a live freebie code is a real interaction, not a passive skip-through
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-3 mr-4"></div>
                  <div>
                    <h4 className="font-semibold text-white">Fair Rewards</h4>
                    <p className="text-white/60">
                      First-to-type wins it, and nothing you win ever expires
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-3 mr-4"></div>
                  <div>
                    <h4 className="font-semibold text-white">Authentic Connections</h4>
                    <p className="text-white/60">
                      Help brands build genuine relationships with their target audience
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <Card className="bg-card/50 backdrop-blur-sm border-white/10 p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 font-sora">
                    Watch. Catch a Code. Get Paid.
                  </h3>
                  <p className="text-white/60">
                    Our platform turns brand videos into a continuous stream viewers
                    actually want to stick around for.
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
              <h2 className="text-3xl font-bold text-white mb-4 font-sora">Our Values</h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                The principles that guide everything we do and every decision we make
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card key={index} className="text-center h-full bg-card/50 backdrop-blur-sm border-white/10">
                    <CardContent className="p-6">
                      <Icon className="h-10 w-10 text-secondary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-3">{value.title}</h3>
                      <p className="text-white/60 text-sm">{value.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <Card className="bg-gradient-to-r from-primary to-primary/70 text-white mx-4">
            <CardContent className="p-8 sm:p-12 text-center">
              <h2 className="text-3xl font-bold mb-4 font-sora">Join Pazzell</h2>
              <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                Whether you want to earn money watching ads or create engaging
                campaigns for your brand, we&apos;d love to have you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={routes.WATCH}>
                  <GradientButton variant="secondary" size="lg" className="w-full sm:w-auto">
                    Start Watching
                  </GradientButton>
                </Link>
                <Link href={`${routes.REGISTER}?type=brand`}>
                  <GradientButton variant="outline" size="lg" className="w-full sm:w-auto">
                    Create Brand Campaigns
                  </GradientButton>
                </Link>
              </div>
              <div className="mt-8 pt-8 border-t border-white/20">
                <p className="text-white/90 mb-4">Have questions? We&apos;d love to hear from you.</p>
                <a
                  href="mailto:hello@pazzell.com"
                  className="inline-flex items-center text-white hover:text-white/80 transition-colors">
                  <Mail className="h-4 w-4 mr-2" />
                  hello@pazzell.com
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
}
