import * as React from 'react';
import { Link } from 'react-router-dom';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import backgroundImage from '@/assets/faq-bg.jpg';
import foregroundImage from '@/assets/image-06.jpg';

const faqData = [
  {
    question: 'When do I actually get paid?',
    answer: 'Earnings accrue as views verify. After a campaign closes, funds are held for a 7-day verification window, then released straight to your mobile money — MTN MoMo or Airtel Money.',
  },
  {
    question: 'Is there a follower minimum?',
    answer: 'No. A new account earns on the same terms as a large one. The rate is published before anyone commits, and neither side negotiates.',
  },
  {
    question: 'What happens if my video goes viral?',
    answer: 'Earnings accrue against the campaign\'s remaining budget until it is exhausted. You can earn well, but the budget is the ceiling — and every campaign shows that budget live before you start.',
  },
  {
    question: 'Do I post on my own account?',
    answer: 'Yes. You keep the audience you build. You follow the brief — topic, angle, hashtags, disclosure — and submit the link. The brand reviews every submission before it earns.',
  },
  {
    question: 'What does Unignored not do?',
    answer: 'We don\'t pay for followers, likes, or engagement — only views. We don\'t guarantee any creator an income. We don\'t let brands pick accounts on bounty campaigns. And we don\'t pay out on views we can\'t verify against the platform.',
  },
  {
    question: 'How do brands know views are real?',
    answer: 'Every view is checked against the platform\'s data and screened for inauthentic patterns before it becomes billable. Brands pay only for verified views, and unspent budget is refunded.',
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

interface FAQProps extends React.ComponentProps<'section'> {}

const FAQ = ({ className, ...props }: FAQProps) => {
  return (
    <section
      className={cn(
        'py-32 px-10 max-lg:py-24 max-md:py-24 max-md:px-6 max-xs:py-20 max-xs:px-5',
        className
      )}
      {...props}
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center mb-16 max-md:mb-12">
          <span className="text-xs tracking-[1px] uppercase font-semibold">
            Frequently Asked Questions
          </span>
          <h2 className="text-[4.5rem] max-lg:text-[3rem] max-md:text-[2rem] leading-[1.2] font-bold font-display">
            Questions & Answers
          </h2>
          <div className="w-full">
            <p className="text-muted-foreground text-lg leading-[1.4] font-normal">
              Find clear answers to the most common questions about how the platform works, what features are included, and how to get started.
            </p>
          </div>
        </div>

        <div className="flex justify-start items-stretch w-full gap-6 max-lg:flex-col max-lg:gap-8">
          <div className="w-1/2 max-lg:w-full">
            <div className="relative w-full h-full min-h-[600px] xl:min-h-[680px] 2xl:min-h-[750px] 3xl:min-h-[850px] max-lg:min-h-[500px] md:max-lg:min-h-[580px] max-md:min-h-[400px] overflow-hidden">
              <img
                src={backgroundImage}
                alt=""
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover rounded-[40px]"
              />
              <img
                src={foregroundImage}
                alt="Professional woman"
                width={512}
                height={640}
                loading="lazy"
                decoding="async"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[25rem] xl:w-[28rem] 2xl:w-[32rem] 3xl:w-[38rem] max-lg:w-[55vw] max-md:w-[60vw] rounded-t-[34px] shadow-[0_16px_16px_rgba(10,16,29,0.1)] object-cover"
              />
            </div>
          </div>

          <div className="w-1/2 max-lg:w-full flex flex-col">
            <div className="flex flex-col justify-between flex-1 gap-6 2xl:gap-8">
              <AccordionPrimitive.Root
                type="single"
                collapsible
                className="flex flex-col w-full gap-4 2xl:gap-5"
              >
                {faqData.map((item, index) => (
                  <FAQItem
                    key={index}
                    value={`item-${index}`}
                    question={item.question}
                    answer={item.answer}
                  />
                ))}
              </AccordionPrimitive.Root>

              <div className="flex justify-end">
                <Button variant="invofy" size="invofy" asChild>
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
