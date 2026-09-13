import * as React from 'react';
import { Link } from 'react-router-dom';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import backgroundImage from '@/assets/faq-bg.jpg';
import foregroundImage from '@/assets/image-06.jpg';
import type { Audience } from '@/lib/audience';

const faqData: { question: string; answer: string; audience?: Audience }[] = [
  {
    question: 'Is Free actually free?',
    answer: 'Yes. We make money from Creator Pro ($9/mo) and Twen Plus ($49/mo), not from taking a cut of campaigns or earnings.',
  },
  {
    question: 'What can I do without paying?',
    audience: 'creator',
    answer: 'Join open campaigns, post, and get paid to mobile money after a 7-day check. You keep every dollar you earn.',
  },
  {
    question: 'What can I do without paying?',
    audience: 'brand',
    answer: 'Fund a campaign and pay per 1,000 verified views. Campaigns run at least 15 days. Unused escrow is returned when the campaign ends — you can extend, not cancel early.',
  },
  {
    question: 'Why would a brand pay $49?',
    audience: 'brand',
    answer: 'If you want to search creators, hire specific people, message them, and agree a rate before they post.',
  },
  {
    question: 'Why would a creator pay $9?',
    audience: 'creator',
    answer: 'If you want brands to find you, set your own rate, connect more than one account, get hired, and get paid as soon as a campaign ends.',
  },
  {
    question: 'Do paying creators get campaigns first?',
    audience: 'creator',
    answer: 'No. Open campaigns are open to everyone. Creator Pro helps brands find you — it does not hide open campaigns from free creators.',
  },
  {
    question: 'Why not just pay on WhatsApp?',
    audience: 'creator',
    answer: 'On Twen the budget is held until views are checked. Creator Pro is paid as soon as the campaign closes.',
  },
  {
    question: 'Why not just pay on WhatsApp?',
    audience: 'brand',
    answer: 'On Twen the budget is held until views are checked. Unused escrow is returned when the campaign ends.',
  },
];

interface FAQItemProps {
  question: string;
  answer: string;
  value: string;
}

const FAQItem = ({ question, answer, value }: FAQItemProps) => (
  <AccordionPrimitive.Item
    value={value}
    className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] overflow-hidden"
  >
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between p-7 max-xs:p-5 text-left group">
        <span className="text-2xl max-xs:text-xl font-medium leading-[1.3] pr-4">
          {question}
        </span>
        <div className="flex items-center justify-center w-11 h-11 max-xs:w-9 max-xs:h-9 bg-[#0a101d] rounded-full flex-shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-45">
          <Plus className="w-5 h-5 max-xs:w-4 max-xs:h-4 text-white" strokeWidth={2} />
        </div>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
    <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
      <div className="px-7 pb-7 pt-0 max-xs:px-5 max-xs:pb-5">
        <p className="text-base max-xs:text-sm leading-[1.5] text-muted-foreground">
          {answer}
        </p>
      </div>
    </AccordionPrimitive.Content>
  </AccordionPrimitive.Item>
);

interface FAQProps extends React.ComponentProps<'section'> {
  audience?: Audience;
}

const FAQ = ({ className, audience = 'creator', ...props }: FAQProps) => {
  const items = faqData.filter((item) => !item.audience || item.audience === audience);
  return (
    <section
      className={cn(
        'py-20 px-5 md:py-24 md:px-6 lg:py-32 lg:px-10',
        className
      )}
      {...props}
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center mb-10 md:mb-16">
          <span className="text-xs tracking-[1px] uppercase font-semibold">
            Frequently Asked Questions
          </span>
          <h2 className="text-[clamp(2rem,6vw,4.5rem)] leading-[1.15] font-bold font-display">
            Common questions
          </h2>
          <div className="w-full">
            <p className="text-muted-foreground text-lg leading-[1.4] font-normal">
              Short answers. If you need more, contact us.
            </p>
          </div>
        </div>

        <div className="flex justify-start items-stretch w-full gap-6 max-lg:flex-col max-lg:gap-8">
          <div className="w-1/2 max-lg:w-full">
            <div className="relative w-full h-full min-h-[16rem] md:min-h-[400px] lg:min-h-[500px] xl:min-h-[680px] overflow-hidden">
              <img
                src={backgroundImage}
                alt=""
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover rounded-[40px]"
                aria-hidden="true"
              />
              <img
                src={foregroundImage}
                alt="Creator reading Twen pricing and campaign questions"
                width={512}
                height={640}
                loading="lazy"
                decoding="async"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(16rem,70vw)] md:w-[60vw] lg:w-[25rem] xl:w-[28rem] 2xl:w-[32rem] rounded-t-[28px] md:rounded-t-[34px] shadow-[0_16px_16px_rgba(10,16,29,0.1)] object-cover"
              />
            </div>
          </div>

          <div className="w-1/2 max-lg:w-full flex flex-col">
            <div className="flex flex-col justify-between flex-1 gap-6 2xl:gap-8">
              <AccordionPrimitive.Root
                key={audience}
                type="single"
                collapsible
                className="flex flex-col w-full gap-4 2xl:gap-5"
              >
                {items.map((item, index) => (
                  <FAQItem
                    key={item.question}
                    value={`item-${index}`}
                    question={item.question}
                    answer={item.answer}
                  />
                ))}
              </AccordionPrimitive.Root>

              <div className="flex justify-end max-md:justify-stretch">
                <Button variant="invofy" size="invofy" className="max-md:w-full" asChild>
                  <Link to="/contact">Ask a question</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
