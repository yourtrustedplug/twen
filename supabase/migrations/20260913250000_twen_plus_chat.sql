-- Twen Plus required to start or message a creator chat.
-- Twen welcome chats stay on the free plan.

DROP POLICY IF EXISTS "Brands start conversations" ON public.conversations;
CREATE POLICY "Brands start conversations" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = brand_id
  AND coalesce(kind, 'direct') IS DISTINCT FROM 'twen'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'brand'
      AND p.plan = 'pro'
  )
);

DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND coalesce(from_twen, false) = false
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.brand_id = auth.uid() OR c.creator_id = auth.uid())
      AND c.kind IS DISTINCT FROM 'twen'
      AND (
        c.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.plan = 'pro'
        )
      )
  )
);
