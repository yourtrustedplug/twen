const missionBlocks = [
  {
    title: 'Simplify Financial Tasks',
    description: 'We aim to remove the complexity from invoicing and document creation, making essential financial tasks faster and easier for everyone.',
  },
  {
    title: 'Enable Solo Entrepreneurs',
    description: 'Our platform is built to empower freelancers and small business owners with tools that improve organization, clarity, and professionalism.',
  },
  {
    title: 'Deliver Practical Solutions',
    description: 'We focus on building features that solve real-world needs, helping users save time and stay focused on growing their work.',
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
            Invofy was built to simplify everyday work by creating intuitive tools that help freelancers and small businesses focus on what matters most.
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
