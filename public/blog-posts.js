/* Single source of truth for blog articles.
   Both the Blog page and the homepage "From the blog" section read this, so a
   post added here appears in both. Newest first; the homepage shows the first
   six and the blog page shows them all.
   `featured: true` pins a post to the large card at the top of the blog page.

   No articles yet (sample articles removed 28 Sep 2026). While this list is
   empty the Blog page shows its "Coming soon" message and the homepage hides
   its Latest Articles section. To publish one, add an entry of this shape:
     {
       title: 'Article title',
       category: 'Hiring',            // Hiring | Talent | Product
       excerpt: 'One or two sentences for the card.',
       date: '1 October 2026',
       read: '5 min read',
       href: '/blog/article-slug',
       featured: true                  // optional
     }
*/
window.NR_BLOG_POSTS = [];
