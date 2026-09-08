const missionBlocks = [
  {
    title: 'Pay for What Happens',
    description: 'We believe attention should be measured, not guessed. Creators earn on verified views — never on follower counts or promises.',
  },
  {
    title: 'Money Before Work',
    description: 'Campaigns are escrow-funded before creators see them. The budget exists before anyone commits their time, and unspent money goes back.',
  },
  {
    title: 'Built for This Region',
    description: 'Mobile money payouts, local creators, local languages, local formats. Payout is MTN MoMo or Airtel Money — not PayPal, not crypto.',
  },
];

const AboutMission = () => {
  return (
    <section className="w-full bg-background py-32 max-[991px]:py-24 max-[479px]:py-20 px-10 max-[767px]:px-6 max-[479px]:px-5">
      <div className="max-w-[100rem] mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16 max-[479px]:mb-12">
          <span className="text-foreground text-sm font-semibold uppercase tracking-[0.2em] mb-6 max-[479px]:text-xs max-[479px]:mb-4">
            Our Mission
          </span>
          <h2 className="text-[2.5rem] max-[991px]:text-[2rem] max-[479px]:text-2xl font-bold leading-[1.2] max-w-[50rem]">
            You already make the videos. You already get the views. Twen is where those views turn into money.
          </h2>
        </div>

        {/* Blocks Grid */}
        <div className="grid grid-cols-3 max-[991px]:grid-cols-1 gap-6">
          {missionBlocks.map((block, index) => (
            <div
              key={index}
              className="bg-[#FAFAFA] border border-[#f1f1f1] rounded-[30px] p-8"
            >
              <h3 className="text-[2rem] max-[479px]:text-2xl font-bold mb-8">
                ✦ {block.title}
              </h3>
              <div className="border-b border-dashed border-[#e9e9e9] mb-8" />
              <p className="text-lg leading-[1.5] text-muted-foreground">
                {block.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutMission;
