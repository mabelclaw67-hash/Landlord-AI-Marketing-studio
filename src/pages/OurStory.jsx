import { Link } from "react-router-dom";
import { normalizeLang } from "../utils/lang";

// Founder story behind the independent-landlord-support positioning.
// Factual timeline: 2008-2018 independent landlord in Calgary, 2018-present in
// BC while increasingly supporting other independent landlords. This is 18
// years of firsthand landlord experience — not 18 years operating a property
// management company.
const COPY = {
  en: {
    eyebrow: "OUR STORY",
    title: "Built from 18 years of real-world experience as an independent landlord.",
    paragraphs: [
      "Our story began in 2008 in Calgary, where we spent ten years managing our own rental properties and learning firsthand what it really means to be a small landlord.",
      "In 2018, that experience moved with us to British Columbia.",
      "Over time, we began helping friends and other independent landlords with their rental properties — not by taking control away from them, but by providing practical, professional support based on each landlord's individual needs.",
      "Looking back, that has always been the VanIsland model.",
      "We understand that many independent landlords don't want a traditional property management company to take over their property. They want to stay involved, make their own decisions and remain in control.",
      "What they often need is experienced support when renting becomes complicated, time-consuming or unfamiliar. That's where VanIsland comes in.",
      "We help landlords with the parts where professional experience, good systems and careful execution matter — while the landlord remains in control of the property and the decisions.",
    ],
    timelineTitle: "The timeline",
    timeline: [
      { period: "2008 – 2018", place: "Calgary, Alberta", desc: "Ten years managing our own rental properties as an independent landlord." },
      { period: "2018 – Present", place: "British Columbia", desc: "Continuing to manage our own rentals, while increasingly supporting friends and other independent landlords — landlord-directed and case by case." },
    ],
    closing: [
      ["Stay independent.", "Get professional support."],
      ["We don't replace the landlord.", "We support the landlord."],
    ],
    ctaLabel: "Get Landlord Support",
    ctaSecondary: "Explore Our Services",
  },
  zh: {
    eyebrow: "我们的故事",
    title: "源于 18 年独立房东的亲身经历。",
    paragraphs: [
      "故事始于 2008 年的卡尔加里。我们用十年时间打理自己的出租物业，真正体会到做一个小房东是怎么一回事。",
      "2018 年，我们带着这些经验来到卑诗省。",
      "慢慢地，我们开始帮朋友和其他独立房东打理他们的出租物业——不是把主导权拿过来，而是按每位房东各自的需要，提供务实、专业的支持。",
      "回头看，这一直就是 VanIsland 的模式。",
      "我们明白，很多独立房东并不希望由传统物业管理公司接管自己的物业。他们希望继续参与、自己拿主意、保持掌控。",
      "他们真正需要的，是在出租变得复杂、耗时或不熟悉时，有经验的人搭把手。这正是 VanIsland 的位置。",
      "在需要专业经验、良好系统和细致执行的环节，我们提供帮助——而物业和决定权，始终在房东手中。",
    ],
    timelineTitle: "时间线",
    timeline: [
      { period: "2008 – 2018", place: "阿尔伯塔省 卡尔加里", desc: "以独立房东身份，用十年时间打理自己的出租物业。" },
      { period: "2018 至今", place: "卑诗省", desc: "继续打理自己的出租物业，同时越来越多地为朋友和其他独立房东提供支持——由房东主导，按具体情况提供帮助。" },
    ],
    closing: [
      ["保持独立。", "获得专业支持。"],
      ["我们不取代房东。", "我们支持房东。"],
    ],
    ctaLabel: "获取房东支持",
    ctaSecondary: "了解我们的服务",
  },
};

export default function OurStory({ lang }) {
  const copy = COPY[normalizeLang(lang)] || COPY.en;

  return (
    <div className="pub-page story-page">
      <section className="pub-hero story-hero">
        <div className="story-hero__eyebrow">{copy.eyebrow}</div>
        <h1 className="pub-hero__title story-hero__title">{copy.title}</h1>
      </section>

      <section className="story-section">
        <div className="container story-container">
          {copy.paragraphs.map((text) => (
            <p key={text.slice(0, 24)} className="story-para">{text}</p>
          ))}
        </div>
      </section>

      <section className="story-section story-section--tint">
        <div className="container story-container">
          <h2 className="story-subhead">{copy.timelineTitle}</h2>
          <div className="story-timeline">
            {copy.timeline.map((item) => (
              <article key={item.period} className="story-timeline__item">
                <div className="story-timeline__period">{item.period}</div>
                <div className="story-timeline__place">{item.place}</div>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="container story-container story-container--center">
          {copy.closing.map(([a, b]) => (
            <p key={a} className="story-closing">
              <span>{a}</span>
              <span>{b}</span>
            </p>
          ))}
          <div className="story-actions">
            <Link className="btn btn--sage" to="/contact">{copy.ctaLabel}</Link>
            <Link className="btn btn--ghost" to="/services">{copy.ctaSecondary}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
