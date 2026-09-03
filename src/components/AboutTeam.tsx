import teamMember01 from '@/assets/about/team-member-01.jpg';
import teamMember02 from '@/assets/about/team-member-02.jpg';
import teamMember03 from '@/assets/about/team-member-03.jpg';
import teamMember04 from '@/assets/about/team-member-04.jpg';

const teamMembers = [
  {
    name: 'Daniel Carter',
    role: 'Chief Executive Officer',
    image: teamMember02,
    bgColor: '#E0F4F4',
  },
  {
    name: 'Sophia Mitchell',
    role: 'Chief Technology Officer',
    image: teamMember03,
    bgColor: '#FDF6D8',
  },
  {
    name: 'Lucas Bennett',
    role: 'Head of Product',
    image: teamMember01,
    bgColor: '#E8E0F0',
  },
  {
    name: 'Olivia Parker',
    role: 'Head of Marketing',
    image: teamMember04,
    bgColor: '#FCE4EC',
  },
];

interface TeamMemberCardProps {
  name: string;
  role: string;
  image: string;
  bgColor: string;
}

const TeamMemberCard = ({ name, role, image, bgColor }: TeamMemberCardProps) => (
  <div 
    className="rounded-[30px] overflow-hidden"
    style={{ backgroundColor: bgColor }}
  >
    {/* Photo area */}
    <div className="aspect-square overflow-hidden rounded-b-[20px]">
      <img 
        src={image} 
        alt={name}
        width={300}
        height={300}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover object-top"
      />
    </div>
    
    {/* Info box */}
    <div className="bg-white rounded-[20px] m-4 p-6">
      <h3 className="text-xl font-bold leading-[1.4]">{name}</h3>
      <div className="border-b border-dashed border-[#e9e9e9] my-3" />
      <p className="text-base text-muted-foreground leading-[1.5]">{role}</p>
    </div>
  </div>
);

const AboutTeam = () => {
  return (
    <section className="px-10 max-[767px]:px-6 max-[479px]:px-5 pb-32 max-[991px]:pb-24 max-[479px]:pb-20">
      <div className="max-w-[100rem] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center mb-12">
          <span className="text-xs tracking-[0.15em] uppercase font-semibold">
            MAKERS AND THINKERS
          </span>
          <h2 className="text-[4.5rem] max-[991px]:text-[3rem] max-[767px]:text-[2rem] leading-[1.2] font-bold font-display">
            The People Behind Our Platform
          </h2>
          <p className="text-muted-foreground text-lg leading-[1.4] font-normal">
            A group of designers, developers, and problem-solvers focused on creating a simple, reliable, and professional invoicing experience for freelancers and independent businesses.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-4 max-[991px]:grid-cols-2 max-[767px]:grid-cols-1 gap-6">
          {teamMembers.map((member) => (
            <TeamMemberCard key={member.name} {...member} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutTeam;
