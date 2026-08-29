const COPY = {
  en: {
    title: "Landlord Knowledge Center",
    subtitle:
      "A practical knowledge base for Vancouver Island landlords: government rules, local market observations, and VanIsland's practical rental experience.",
    updated: "Latest policy update: August 27, 2026",
    status: "Status: General reference, professional review required",
    openGuide: "Open guide",
    categoryLabel: "Category",
    lastReviewed: "Last Reviewed: July 2026",
    nextReview: "Next Review: October 2026",
    cardStatus: "Status: General reference, professional review required",
    sectionCta: "Reference card",
    disclaimerTitle: "Reference only",
    disclaimer:
      "These guides are general references for landlords. Rules can change, and final rental strategy should receive professional review before publishing or making a compliance decision.",
    detailLabels: {
      lastUpdated: "Last Updated: July 2026",
      officialSources: "Official Sources",
      keyPoints: "Key Points",
      landlordChecks: "What landlords should check",
      reviewNote: "When professional review is recommended",
      disclaimer:
        "This content is for general reference only and is not legal advice. Rules may change. Final decisions should be based on government websites and professional review.",
    },
    pillars: [
      {
        id: "government-rules",
        title: "Government Rules",
        cards: [
          {
            id: "bc-rental-rules",
            icon: "⚖️",
            title: "BC Rental Rules",
            body: "Core tenancy reminders for advertising, deposits, screening, notices, and owner responsibilities.",
          },
          {
            id: "rent-increases",
            icon: "📈",
            title: "2027 BC Annual Rent Increase",
            body: "Official update: the maximum annual rent increase for covered residential tenancies is 2.2% in 2027. Review the effective date, notice, calculation, exemptions, and manufactured-home-park rules.",
            href: "#rent-increases",
            lastReviewed: "Last Reviewed: August 27, 2026",
            nextReview: "Next Review: October 2026",
          },
          {
            id: "owner-occupancy",
            icon: "🏠",
            title: "Owner Occupancy",
            body: "General guidance for owner-occupancy situations, re-rental timing, and when professional review is recommended before listing.",
          },
          {
            id: "str",
            icon: "🧳",
            title: "Airbnb / STR",
            body: "Short-term rental policy reminders for BC and municipal checks before deciding on an STR strategy.",
            href: "#str",
          },
          {
            id: "secondary-suite",
            icon: "🏘️",
            title: "Secondary Suite / Legal Suite",
            body: "Practical notes on legal suite status, privacy, utilities, parking, and split-rental positioning.",
            href: "#secondary-suite",
          },
        ],
      },
      {
        id: "market-insights",
        title: "Local Market Insights",
        cards: [
          {
            id: "nanaimo-market-notes",
            icon: "📍",
            title: "Nanaimo Rental Market Notes",
            body: "Placeholder notes for Nanaimo and nearby Vancouver Island rental demand, tenant depth, and pricing sensitivity.",
          },
          {
            id: "facebook-marketplace-observations",
            icon: "💬",
            title: "Facebook Marketplace Observations",
            body: "Placeholder observations for inquiry quality, photo performance, headline clarity, and common renter questions.",
          },
          {
            id: "high-rent-whole-house-risks",
            icon: "💰",
            title: "High-Rent Whole House Rental Risks",
            body: "Placeholder notes for premium whole-home rentals, smaller tenant pools, longer leasing timelines, and price testing.",
          },
        ],
      },
      {
        id: "professional-guides",
        title: "Professional Guides",
        cards: [
          {
            id: "whole-house-vs-split-rental",
            icon: "🧭",
            title: "Whole House vs Split Rental",
            body: "A practical framework for comparing simple whole-home rental against a future two-unit strategy.",
          },
          {
            id: "fenced-backyard-matters",
            icon: "🌿",
            title: "Why Fenced Backyard Matters",
            body: "Why yard privacy, fencing, and outdoor use rules affect pet tenants, families, rent appeal, and application quality.",
          },
          {
            id: "ocean-view-rentals",
            icon: "🌊",
            title: "How to Position Ocean View Rentals",
            body: "How to lead with ocean view, beach access, furnishings, photo order, and premium lifestyle positioning.",
          },
          {
            id: "suite-privacy-hydro-meter",
            icon: "🔌",
            title: "Suite Privacy and Separate Hydro Meter",
            body: "Why separate entrances, private outdoor space, shared areas, and hydro meters matter for split-rental confidence.",
          },
        ],
      },
      {
        id: "faq",
        title: "FAQ",
        cards: [
          {
            id: "faq-airbnb",
            icon: "❓",
            title: "Can I rent my house as Airbnb?",
            body: "Short answer: it depends on principal residence status, local rules, licensing, safety, and the exact rental model.",
          },
          {
            id: "faq-legal-suite",
            icon: "❓",
            title: "Is my suite legal?",
            body: "The permit history, zoning, building code, safety, parking, and utility setup need to be checked before marketing.",
          },
          {
            id: "faq-whole-or-split",
            icon: "❓",
            title: "Should I rent whole house or split into two units?",
            body: "Compare simplicity, rent target, vacancy risk, legal suite feasibility, utility setup, and tenant privacy.",
          },
          {
            id: "faq-no-applications",
            icon: "❓",
            title: "Why is my rental not getting applications?",
            body: "Common causes include price mismatch, weak photos, unclear terms, low tenant depth, or property-specific friction.",
          },
          {
            id: "faq-professional-review",
            icon: "❓",
            title: "When should I ask for professional review?",
            body: "Ask for review before listing if there are STR questions, suite uncertainty, high rent targets, legal risk, or slow inquiry volume.",
          },
        ],
      },
    ],
    detailSections: [
      {
        id: "rent-increases",
        title: "2027 BC Annual Rent Increase",
        intro:
          "Official update: the maximum annual rent increase for covered residential tenancies is 2.2% for increases taking effect on or after January 1, 2027.",
        lastUpdated: "Last updated: August 27, 2026",
        sources: [
          ["BC Government news release - 2027 rent increase", "https://news.gov.bc.ca/releases/2026HMA0085-000982"],
          ["BC Government - Rent increases", "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies/rent-rtb/rent-increases"],
          ["Residential Tenancy Act - Part 3 (sections 41-43)", "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/00_02078_01#part3"],
          ["Residential Tenancy Regulation - section 22", "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/10_477_2003#section22"],
          ["Notice of Rent Increase - Residential Rental Units (RTB-7)", "https://www2.gov.bc.ca/assets/gov/housing-and-tenancy/residential-tenancies/forms/rtb7.pdf"],
        ],
        keyPoints: [
          "The 2027 maximum annual rent increase is 2.2% for covered residential tenancies, and it takes effect January 1, 2027.",
          "The annual percentage is based on the 12-month average percentage change in the all-items Consumer Price Index for B.C. ending in July of the year before the increase takes effect.",
          "A landlord can increase rent only once every 12 months and must give the tenant at least three full months' notice in the approved form, RTB-7.",
          "The increase cannot exceed the amount calculated from the allowable percentage and must not be rounded up. For example, $2,000 × 2.2% = $44, for a maximum new rent of $2,044.",
          "An unused portion of a previous year's allowable increase cannot be carried forward and added to the current year's limit.",
          "For manufactured home park tenancies, the 2027 standard increase is also 2.2%, plus a proportional amount for changes in local government levies and regulated utility fees.",
          "The annual increase does not apply to commercial tenancies, non-profit housing where rent is geared to income, co-operative housing, and some assisted-living facilities.",
          "An increase above the annual limit generally requires the tenant's written agreement or an application to the Residential Tenancy Branch for approval under the Act and regulations.",
        ],
        landlordChecks: [
          "Confirm that at least 12 months have passed since the rent was first payable or since the last legal rent increase.",
          "Use the current RTB-7 form and provide at least three full months' notice before the effective date.",
          "Record the current rent, exact dollar increase, and effective date. Do not round the result up.",
          "For a January 1, 2027 effective date, count three full months and confirm the applicable service and receipt rules before serving the notice.",
          "If the proposed increase is above 2.2%, do not treat the excess as an ordinary annual increase; obtain the required written agreement or RTB approval first.",
        ],
        reviewNote: [
          "The tenancy may fall outside the Residential Tenancy Act or may involve supportive or assisted living.",
          "The property is a manufactured home park and local levies or regulated utility fees may form part of the calculation.",
          "The landlord is considering an increase above the annual limit or an additional rent increase.",
          "The effective date, service method, or timing of an RTB-7 notice is uncertain.",
        ],
      },
      {
        id: "str",
        title: "Airbnb / STR Short-Term Rental Policy",
        intro:
          "A stable, landlord-friendly summary of BC short-term rental principles, with official links for final verification.",
        sources: [
          ["BC Government - Short-term rentals", "https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals"],
          ["BC Government - Principal residence requirement", "https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/principal-residence-requirement"],
          ["City of Nanaimo - Short-Term Rentals", "https://www.nanaimo.ca/doing-business/business-licences/short-term-rentals"],
          ["District of Lantzville - Business Licence", "https://www.lantzville.ca/cms.asp?wpID=924"],
        ],
        keyPoints: [
          "Short-term rentals commonly include Airbnb, Vrbo, Booking.com, and stays of 90 days or less. Local definitions may be stricter, so the municipal rule must be checked.",
          "BC requires hosts and platforms to register and pay annual registration fees.",
          "In many BC communities, short-term rentals are limited to the host's principal residence. Nanaimo is listed by BC as a community where the principal residence requirement applies as of June 1, 2026.",
          "BC lists Lantzville as exempt from the provincial principal residence requirement as of June 1, 2026, unless the local government opts in. Local business licence, zoning, and bylaw rules still need verification.",
          "Nanaimo's STR page describes short-term rental accommodation in an operator's primary residence, secondary suite, or carriage house for less than 30 consecutive days, with local guest and bedroom limits.",
          "A third-party operator does not remove the need to confirm principal residence, licence, zoning, insurance, and safety requirements.",
        ],
        landlordChecks: [
          "Is the property in Nanaimo, Lantzville, or another municipality or regional district?",
          "Is the property the owner's principal residence?",
          "Will the owner rent rooms only, a suite, a carriage house, or the whole home?",
          "Is a business licence, provincial STR registration, or annual renewal required?",
          "Are parking, strata, insurance, fire safety, smoke alarms, and building requirements satisfied?",
          "Official information needs further confirmation if the local page does not clearly address the exact property and rental model.",
        ],
        reviewNote: [
          "Whole-home Airbnb or VRBO is being considered.",
          "The owner will not live on site.",
          "The owner wants to use a third-party operator.",
          "The property is in Lantzville or another area where local STR guidance is not clear from the website.",
          "The plan includes a secondary suite, carriage house, or mixed long-term and short-term rental structure.",
        ],
      },
      {
        id: "secondary-suite",
        title: "Secondary Suite / Legal Suite Guide",
        intro:
          "A practical summary for deciding whether a suite can be marketed as legal, authorized, or only a future split-rental opportunity.",
        sources: [
          ["City of Nanaimo - Secondary Suite Permit", "https://www.nanaimo.ca/property-development/building-permits/residential-building-permit/secondary-suite-permit"],
          ["City of Nanaimo - Building Permits", "https://www.nanaimo.ca/property-development/building-permits"],
          ["District of Lantzville - Building Permit", "https://www.lantzville.ca/cms.asp?wpID=888"],
          ["District of Lantzville - Business Licence", "https://www.lantzville.ca/cms.asp?wpID=924"],
        ],
        keyPoints: [
          "A legal or authorized suite is generally stronger for marketing, rent confidence, insurance review, and risk management than an unauthorized suite.",
          "Nanaimo states that a permit is required to construct a new suite or upgrade an existing suite.",
          "Nanaimo states that utility charges do not make a suite legal; only a suite created under a building permit is considered legal or authorized.",
          "Permit, zoning, building code, fire separation, sound separation, alarms, parking, entrance, kitchen, laundry, and utility setup all affect rental risk and tenant appeal.",
          "Lantzville states that building permits are required for new buildings, additions, and renovations, and applications are reviewed against the BC Building Code. Official suite-specific information needs further confirmation.",
        ],
        landlordChecks: [
          "Was the suite created or upgraded under a building permit?",
          "Does the suite have a separate entrance, kitchen, bathroom, laundry plan, and safe egress?",
          "Is there enough parking for the rental structure?",
          "Are hydro meter, utilities, shared areas, and yard privacy clear enough for tenant expectations?",
          "Are fire separation, smoke alarms, insurance, zoning, and building code requirements confirmed?",
          "Can the listing honestly describe the suite as legal or authorized, or should it be described more cautiously?",
        ],
        reviewNote: [
          "The owner is not sure whether the suite is legal or authorized.",
          "The owner wants to add a kitchen or convert a lower level into a second rental unit.",
          "Utilities, laundry, parking, entrance, or yard use will be shared.",
          "The rent strategy depends on advertising two units instead of one whole-home rental.",
          "The property is in Lantzville and official suite-specific information still needs confirmation.",
        ],
      },
    ],
  },
  zh: {
    title: "房东知识中心",
    subtitle: "面向温哥华岛房东的实用知识库：政府法规、本地市场观察，以及 VanIsland 的实务出租经验。",
    updated: "最新政策更新：2026年8月27日",
    status: "状态：一般参考，需专业审核确认",
    openGuide: "查看指南",
    categoryLabel: "分类",
    lastReviewed: "最后审核：2026年7月",
    nextReview: "下次审核：2026年10月",
    cardStatus: "状态：一般参考，需专业审核确认",
    sectionCta: "参考卡片",
    disclaimerTitle: "仅供参考",
    disclaimer:
      "这些内容是给房东使用的一般参考。法规和本地政策可能变化，正式挂牌、出租策略或合规判断前，仍需专业审核确认。",
    detailLabels: {
      lastUpdated: "最后更新：2026年7月",
      officialSources: "官方来源",
      keyPoints: "重点内容",
      landlordChecks: "房东需要核查什么",
      reviewNote: "建议专业审核的情况",
      disclaimer:
        "本内容仅作一般参考，不构成法律意见。法规可能变化，最终请以政府官网和专业审核为准。",
    },
    pillars: [
      {
        id: "government-rules",
        title: "政府法规",
        cards: [
          {
            id: "bc-rental-rules",
            icon: "⚖️",
            title: "BC 租赁法规",
            body: "BC 住宅租赁中的广告、押金、租客筛选、通知和房东责任基础提醒。",
          },
          {
            id: "rent-increases",
            icon: "📈",
            title: "2027 年 BC 租金上涨规定",
            body: "官方更新：受法规覆盖的住宅租赁，2027 年最高年度租金上涨幅度为 2.2%。可查看生效日期、通知、计算、例外情况和流动房屋公园规则。",
            href: "#rent-increases",
            lastReviewed: "最后审核：2026年8月27日",
            nextReview: "下次审核：2026年10月",
          },
          {
            id: "owner-occupancy",
            icon: "🏠",
            title: "屋主自住规则",
            body: "关于屋主自住、重新出租时间风险，以及哪些情况需要专业审核的基础说明。",
          },
          {
            id: "str",
            icon: "🧳",
            title: "Airbnb / STR 短租政策",
            body: "关于 BC 省和城市短租规则核查的提醒，适合考虑 Airbnb / STR 前先阅读。",
            href: "#str",
          },
          {
            id: "secondary-suite",
            icon: "🏘️",
            title: "Secondary Suite / Legal Suite 第二套房与合法套间",
            body: "关于套房合法性、隐私、水电、停车和分租定位的实用判断框架。",
            href: "#secondary-suite",
          },
        ],
      },
      {
        id: "market-insights",
        title: "本地市场观察",
        cards: [
          {
            id: "nanaimo-market-notes",
            icon: "📍",
            title: "Nanaimo 出租市场观察",
            body: "用于记录 Nanaimo 及周边租客需求、租金敏感度、咨询质量和出租周期的静态观察入口。",
          },
          {
            id: "facebook-marketplace-observations",
            icon: "💬",
            title: "Facebook Marketplace 观察",
            body: "用于记录咨询质量、照片效果、标题清晰度和租客常见问题的静态观察入口。",
          },
          {
            id: "high-rent-whole-house-risks",
            icon: "💰",
            title: "高租金整租风险",
            body: "用于提醒高价整租目标客群较小、出租周期可能更长，以及需要测试价格和广告反馈。",
          },
        ],
      },
      {
        id: "professional-guides",
        title: "专业指南",
        cards: [
          {
            id: "whole-house-vs-split-rental",
            icon: "🧭",
            title: "整租 vs 分租",
            body: "用于比较整租简单度、租金目标、空置风险、合法套间可行性和租客隐私。",
          },
          {
            id: "fenced-backyard-matters",
            icon: "🌿",
            title: "为什么围栏后院重要",
            body: "说明围栏、院子隐私和户外使用规则如何影响宠物租客、家庭租客和申请质量。",
          },
          {
            id: "ocean-view-rentals",
            icon: "🌊",
            title: "海景房源如何定位",
            body: "说明如何用海景、海边通达性、家具、照片顺序和生活方式包装高品质出租。",
          },
          {
            id: "suite-privacy-hydro-meter",
            icon: "🔌",
            title: "套间隐私和独立电表",
            body: "说明独立入口、私密户外空间、共用区域和独立电表为什么影响分租信心。",
          },
        ],
      },
      {
        id: "faq",
        title: "常见问题",
        cards: [
          {
            id: "faq-airbnb",
            icon: "❓",
            title: "我的房子可以做 Airbnb 吗？",
            body: "需要看主要住所、当地规则、business licence、安全要求和具体出租模式。",
          },
          {
            id: "faq-legal-suite",
            icon: "❓",
            title: "我的 suite 合法吗？",
            body: "需要核查 permit 记录、zoning、building code、安全、停车和水电设置。",
          },
          {
            id: "faq-whole-or-split",
            icon: "❓",
            title: "我应该整租还是分成两个 unit？",
            body: "需要比较操作简单度、目标租金、空置风险、合法改造可行性、水电和隐私。",
          },
          {
            id: "faq-no-applications",
            icon: "❓",
            title: "为什么我的出租没有申请？",
            body: "常见原因包括定价不匹配、照片弱、条款不清楚、目标租客少或物业本身有阻力。",
          },
          {
            id: "faq-professional-review",
            icon: "❓",
            title: "什么时候需要专业审核？",
            body: "涉及短租、suite 不确定、高租金、法规风险或咨询量不足时，建议先进行专业审核。",
          },
        ],
      },
    ],
    detailSections: [
      {
        id: "rent-increases",
        title: "2027 年 BC 年度租金上涨规定",
        intro:
          "官方更新：受法规覆盖的住宅租赁，凡在 2027 年 1 月 1 日或之后生效的年度租金上涨，最高幅度为 2.2%。",
        lastUpdated: "最后更新：2026年8月27日",
        sources: [
          ["BC 政府新闻稿：2027 年租金上涨", "https://news.gov.bc.ca/releases/2026HMA0085-000982"],
          ["BC 政府：Rent increases", "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies/rent-rtb/rent-increases"],
          ["Residential Tenancy Act：Part 3（第 41-43 条）", "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/00_02078_01#part3"],
          ["Residential Tenancy Regulation：第 22 条", "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/10_477_2003#section22"],
          ["Notice of Rent Increase - Residential Rental Units（RTB-7）", "https://www2.gov.bc.ca/assets/gov/housing-and-tenancy/residential-tenancies/forms/rtb7.pdf"],
        ],
        keyPoints: [
          "2027 年受法规覆盖的住宅租赁，最高年度租金上涨幅度为 2.2%，并适用于 2027 年 1 月 1 日起生效的上涨。",
          "年度上涨比例依据：截至上涨生效年份前一年 7 月，BC 省所有项目消费者价格指数（CPI）的 12 个月平均变化率。",
          "房东每 12 个月只能上涨一次，并且必须使用获批准的 RTB-7 表格，至少提前三个完整月份书面通知租客。",
          "上涨金额不能超过按允许比例计算出的金额，也不能向上舍入。例如：$2,000 × 2.2% = $44，最高新租金为 $2,044。",
          "上一年度没有使用的上涨额度不能结转，也不能加到本年度的允许额度上。",
          "流动房屋公园租赁的 2027 年标准上涨也是 2.2%，另加地方政府税费和受监管公用事业费用变化的比例部分。",
          "商业租赁、租金与收入挂钩的非营利住房、合作社住房，以及部分辅助生活设施不适用这一年度上涨规定。",
          "如果想超过年度上限，通常需要租客书面同意，或依据法律和法规向 Residential Tenancy Branch 申请批准；不能把超出部分当作普通年度上涨直接收取。",
        ],
        landlordChecks: [
          "确认距离租金首次应付日，或上一次合法上涨的生效日，已经至少 12 个月。",
          "使用当前 RTB-7 表格，并在生效日前至少提供三个完整月份的通知。",
          "记录当前租金、精确到分的上涨金额和生效日期；计算结果不能向上舍入。",
          "如果计划让上涨在 2027 年 1 月 1 日生效，要按三个完整月份计算，并在送达前确认适用的送达和视为收到规则。",
          "如果计划上涨超过 2.2%，不要把超出部分当作普通年度上涨；应先取得租客书面同意或 RTB 批准。",
        ],
        reviewNote: [
          "该租赁可能不受 Residential Tenancy Act 覆盖，或属于 supportive / assisted living 情况。",
          "物业属于流动房屋公园，且地方税费或受监管公用事业费用可能参与计算。",
          "房东考虑超过年度上限，或申请额外租金上涨。",
          "RTB-7 的生效日期、送达方式或通知时间不确定。",
        ],
      },
      {
        id: "str",
        title: "Airbnb / STR 短租政策",
        intro: "面向房东的稳定原则总结，帮助先判断是否值得继续做短租可行性核查。",
        sources: [
          ["BC Government - Short-term rentals", "https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals"],
          ["BC Government - Principal residence requirement", "https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/principal-residence-requirement"],
          ["City of Nanaimo - Short-Term Rentals", "https://www.nanaimo.ca/doing-business/business-licences/short-term-rentals"],
          ["District of Lantzville - Business Licence", "https://www.lantzville.ca/cms.asp?wpID=924"],
        ],
        keyPoints: [
          "Short-Term Rental 通常包括 Airbnb、Vrbo、Booking.com，以及 90 天以下的短期住宿；但城市定义可能更严格，最终要看当地规则。",
          "BC 省要求短租 host 和平台完成注册，并缴纳年度注册费用。",
          "多数 BC 地区有 Principal Residence（主要住所）要求。BC 省页面显示，截至 2026 年 6 月 1 日，Nanaimo 属于该要求适用地区。",
          "BC 省页面显示，截至 2026 年 6 月 1 日，Lantzville 属于省级 Principal Residence 要求豁免名单，除非地方政府选择加入；但仍必须核查 Lantzville 当地 business licence、zoning 和 bylaw 要求。",
          "Nanaimo 官方页面说明，短租是在经营者 primary residence、secondary suite 或 carriage house 内提供少于 30 天的住宿，并有本地客人人数和卧室数量限制。",
          "使用第三方运营方不等于自动合规，仍需核查主要住所、许可、分区、保险和安全要求。",
        ],
        landlordChecks: [
          "物业属于 Nanaimo、Lantzville，还是另一个市镇或 regional district？",
          "该物业是否为屋主 Principal Residence（主要住所）？",
          "计划出租房间、合法套间、carriage house，还是整套房屋？",
          "是否需要 city business licence、省级 STR registration 或年度续期？",
          "停车、strata、保险、fire safety、smoke alarms 和 building requirements 是否满足？",
          "如果官方页面没有明确对应这个地址和出租模式，应写作“官方信息需进一步核查”。",
        ],
        reviewNote: [
          "考虑整套 Airbnb / VRBO。",
          "屋主不会住在现场。",
          "计划交给第三方运营。",
          "物业在 Lantzville，且官网没有直接说明该地址和出租模式。",
          "计划把 secondary suite、carriage house、长租和短租混合使用。",
        ],
      },
      {
        id: "secondary-suite",
        title: "Secondary Suite / Legal Suite 第二套房与合法套间政策",
        intro: "帮助房东判断套间是否适合按 legal suite、authorized suite，或未来分租潜力来处理。",
        sources: [
          ["City of Nanaimo - Secondary Suite Permit", "https://www.nanaimo.ca/property-development/building-permits/residential-building-permit/secondary-suite-permit"],
          ["City of Nanaimo - Building Permits", "https://www.nanaimo.ca/property-development/building-permits"],
          ["District of Lantzville - Building Permit", "https://www.lantzville.ca/cms.asp?wpID=888"],
          ["District of Lantzville - Business Licence", "https://www.lantzville.ca/cms.asp?wpID=924"],
        ],
        keyPoints: [
          "合法或已授权套间通常比 unauthorized suite 更容易营销，租金信心更稳，也更利于保险和风险控制。",
          "Nanaimo 官方页面说明，新建 suite 或升级现有 suite 需要 permit。",
          "Nanaimo 官方页面说明，utility charges 不代表 suite 合法；只有通过 building permit 创建的 suite 才被视为 legal / authorized。",
          "Permit、zoning、building code、fire separation、sound separation、alarm、parking、separate entrance、kitchen、laundry 和 utility setup 都会影响出租风险和租客吸引力。",
          "Lantzville 官方页面说明，新建筑、加建和装修需要 building permit，申请会按 BC Building Code 审核；关于 Lantzville 套间的更具体要求，官方信息需进一步核查。",
        ],
        landlordChecks: [
          "该 suite 是否通过 building permit 创建或升级？",
          "是否有独立入口、厨房、卫生间、洗衣安排和安全逃生条件？",
          "停车是否足够支持当前出租结构？",
          "电表、水电分摊、共用区域和院子隐私是否足够清楚？",
          "Fire separation、smoke alarms、insurance、zoning 和 building code 是否已确认？",
          "广告中能否诚实写 legal / authorized suite，还是只能谨慎写作 future suite potential？",
        ],
        reviewNote: [
          "业主不确定 suite 是否 legal / authorized。",
          "计划加厨房，或把楼下改成第二个出租单元。",
          "水电、洗衣、停车、入口或院子需要共用。",
          "租金策略依赖“两个 unit”而不是整租。",
          "物业在 Lantzville，且 suite-specific 官方信息仍需进一步核查。",
        ],
      },
    ],
  },
};

import ContentAccordion from "../components/ContentAccordion";

export default function Resources({ lang }) {
  const safeLang = lang === "zh" ? "zh" : "en";
  const copy = COPY[safeLang];

  return (
    <div className="pub-page knowledge-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{copy.title}</h1>
        <p className="pub-hero__desc">{copy.subtitle}</p>
      </section>

      <section className="section">
        <div className="container">
          <div className="knowledge-pillar-list">
            {copy.pillars.map((pillar) => (
              <section key={pillar.id} id={pillar.id} className="knowledge-pillar">
                <div className="knowledge-pillar__header">
                  <p>{copy.categoryLabel}</p>
                  <h2>{pillar.title}</h2>
                </div>
                <div className="knowledge-grid">
                  {pillar.cards.map((item) => (
                    <KnowledgeCard key={item.id} item={item} pillarTitle={pillar.title} copy={copy} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="knowledge-detail-list">
            {copy.detailSections.map((section) => (
              <PolicySection key={section.id} section={section} labels={copy.detailLabels} />
            ))}
          </div>

          <div className="notice notice--warm knowledge-disclaimer">
            <h4>{copy.disclaimerTitle}</h4>
            <p>{copy.disclaimer}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function KnowledgeCard({ item, pillarTitle, copy }) {
  return (
    <article id={`${item.id}-card`} className="card resource-card knowledge-card">
      <div className="knowledge-card__icon" aria-hidden="true">{item.icon}</div>
      <div>
        <p className="knowledge-card__category">{copy.categoryLabel}: {pillarTitle}</p>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
        <div className="knowledge-card__meta">
          <span>{item.lastReviewed || copy.lastReviewed}</span>
          <span>{item.nextReview || copy.nextReview}</span>
          <span>{copy.cardStatus}</span>
        </div>
        {item.href ? <a className="knowledge-card__link" href={item.href}>{copy.openGuide}</a> : <span className="knowledge-card__placeholder">{copy.sectionCta}</span>}
      </div>
    </article>
  );
}

function PolicySection({ section, labels }) {
  return (
    <ContentAccordion
      id={section.id}
      title={section.title}
      summary={section.intro}
      defaultOpen={false}
      className="knowledge-policy-accordion"
    >
      <p className="knowledge-policy__eyebrow" style={{ marginBottom: 12, color: "var(--color-text-muted)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {section.lastUpdated || labels.lastUpdated}
      </p>

      <div className="knowledge-policy__source-box">
        <h3>{labels.officialSources}</h3>
        <ul>
          {section.sources.map(([label, href]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noreferrer">{label}</a>
            </li>
          ))}
        </ul>
      </div>

      <PolicyList title={labels.keyPoints} items={section.keyPoints} />
      <PolicyList title={labels.landlordChecks} items={section.landlordChecks} />
      <PolicyList title={labels.reviewNote} items={section.reviewNote} />

      <div className="notice notice--warm knowledge-policy__notice">
        <p>{labels.disclaimer}</p>
      </div>
    </ContentAccordion>
  );
}

function PolicyList({ title, items }) {
  return (
    <section className="knowledge-policy__block">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
