Hello

I've worked on 3 different projects throughout this semester.

I will have folders for each of the projects to show diagrams/photos within this folder.

This page serves as my introduction to all of them. 

The last project I did has the most information since I spent the most time on it

TortillaThyme 
https://tortillathyme.xyz/grab

github: https://github.com/ammonelzinga/tortilla
a recipe site that can scrape recipes from other sites, and organize recipes into groups and put them in a calendar
I dropped the ball on it, and it is still pretty buggy but I like it and I hope to pick it back up.
The recipe scraping should work, though it takes a minute to warm up. I am using Firebase for basically everything including hosting,
though I also have it on vercel. So I have some open source recipe parser python scripts I snagged from github, and have that in firebase as well. 

What I want to implement is allow users to generate a grocery list (buggy right now) by adding recipes to their weekly calendar. 
Then, I want to email Walmart and propose my project so that I can use their apis and automatically add the grocery list to a user's walmart cart for them to go pick up. 
It doesn't curretnly use AI which is good because we should be able to vibe code some algorithms that generates the grocery list from their recipes.
I used AI to make most of this. It created most of the code, and told me how to connect everything to firebase and such. 

This project is interesting to me because I saw sites that did this but were a little limited. I wanted no ads. I wanted to remember what meal to make.
In the small chance that I get some live users, maybe I could connect it to charities, so people can pay a small monthly fee to cover firebase costs, 
and then the rest will go to some charity? 

Key learnings 
-included using ai to make algorithms that don't require future ai services. I think the more non ai algorithms we can make the better because it'll 
save us money. 
-In addition, learning how to navigate Firebase and their database and connect it to a domain name I purchased. 
-In addition doing oauth with google.

Right now I'm on a free tier and there's like a minutes warm up to run the service. For authentication I'm just trying to use google oauth for conveneicne. 
The site doesn't have a lot of requests/responses right now, but if it got big, then there would be some things to consider when posting a recipe publicly 
so that everyone on the site could see it. would need to figure out pagination, or limiting queries to filters they select so that it doesn't retreive
every single recipe every time. 


TaxTrail
An app that helps self employed individuals prepare their quarterly estimated taxes. 
The goal was for it to provide real time miles tracking through maps, receipt anaylzing to get expenses,
and a pdf generation tool that autofills the 1040-ES based on the user's data, and other inputs they provide.
So it would support income and expenses. Maybe in the future support online receipts and banking statements. 
This app is the most buggy, and I don't have a website for it yet, just an expo react native app still in development. 

I learned about open source pdf parsing and generation tools. I'm learning how to develop mobile and how frustrating it can be on an iphone without an arrow 
to close the keyboard when your app is so buggy. In regards to database topics, I've learned about storage buckets with supabase. 
I'm using storage to store recipets and pdf files. I have also been able to do authentication with supabase with magic links for sign in codes. 

Yes, my project most likely will integrate with AI. Right now I am working on two receipt analysis strategies. The first is using ocr open source image analyzer.
But the second is just to send the receipt to openai and have it spit out a json of the expenses. Much easier, but more expensive. So hopefully the manual method works well enough.

This project is interesting to me because when I used to work for FreeTaxUSA, I noticed customers would get the underapyment penalty
 for not doing their estimated tax payments, something they didn't even know existed. And I think it would be fun one day to compete with quickbooks and charge
 like a quarter of the price as they do or something. Mine probably wounldn't ever get as good as theirs, buut if its a lot cheaper maybe people would consider it. 

Key learningsw from the project: 
    -When doing mobile devlopment, send design files to the coding agent because mobile development is harder and more rigid than web. It should contain icons as well. 
    -Supabase is fantastic. Use it, but its best to thoroughly thoroughly plan out the schema beforehand. For me, I negelected some things so I'm gonna have to go in and add quite a bit more. It'll be fine but its nice to think things through more first especially when it comes to the database.

My failover strategy is to cache the images users upload of the receipts to their phones for at least a week (supabase makes copies every week for their basic payed plan). It could be good to require a receipt image that's already on their phone, and do NOT support taking a picture through the app to mitigate chance of losing data as well. The PDF can be regenerated which is nice. For income and expenses and miles, I suppose just make sure supabase makes the snapshots every week and check if there is any loss of data. 
For scaling, the free tier on supabase will only cover about 5 serious active users who takes frequent pictures of their receipts. Read and Write requets shouldn't ever be a problem because the user only uploads for themself and sees their own data, and will rarely look at all of their data anyway, so you'll always pay for more storage than requests on supabase and probably aws as well. In other words, scaling should be simple, just look at the storage you need for more users, since adding more users doesn't affect concurrency or anything too much since it's users look at their own data, and will only post on average a few times a week.


ScriptureLensAI
https://scripture-lensai2-0.vercel.app/

github: https://github.com/ammonelzinga/scriptureLensai2.0
 a website to help people find, study, and compare scriptures both in the Church's cannon, and other sources such as the Pseudepigrapha.
I embed scripture chunks and use that to help with search tools. This project was half done for this class and half done for another class. So although I have 
spent over 20 hours on this one, I am only counting 10 hours for this class so I'm not double dipping haha. It is the least buggy one out of the three.

I learned SO much from this project. 

First I learned more about embeddings. Openai supports custom embedding vector sizes. I started out with larger embedding sizes over a 1000 but cut down to 512 at the end and it worked well. I tried several different embedding strategies. Embed each indiviudal verse, each chapter, embed a summary of a chapter, embed a summary of a verse, and embed a group of verses. I found that embedding a group of verses was not only the lowest storage option but also  the most effective. 
They key was to send the whole chapter to openai and tell it to form verse chunk sizes of about 3-10 verses per chunk. Then it would embed that. 
Each verse was still its own row in the Verses table of my postgres database, but it had a foreign key to the embedding chunk it belonged to. 
So when I embed a user's question, it compares that value to the embedding chunks to find relevant scriptures, and it works better than it has before even with only having a
vector size of 512. 

Overall I have so far paid openai about $10. Honestly I consider that a bargain, especially when you take into account how much money they are losing on their free chatgpt site from me. 

AI did help me with this project constructing code, scripts, guidance, etc. 

This project is super interesting to me because there are so many sacred texts to people from all different religions, that there's not enough time to study them all. 
But I figured I could help humanity out by embedding obscure/uncommon religious texts to help people find them via similar texts from other faiths or scriptures. 
And I like to see parrallels with our scriptures with other non cannoncial scriptures. 

key learnings: 
    - Having openai group similar verses for me before I embed improvevd results
    - Be creative with schema to drive down database storage costs. I had over 500 mb with my bible upload originally. Then I got creative with the chunks and the schema and brought it down to 40 MB. 
    - Supabase allows for some good edge functions, its like a free backend server, its pretty amazing and fast too. I'm doing a lot of vector calculations and it does it pretty quick.
    - Don't keep rerunning the embedding script accidentally, otherwise you'll pay more money than you wanted to (sad face)

Strategies: 
    - Reduce costs by caching user questions and their embeddings. Put it into a supabase table, and when a new question is asked compare it lexically to see if there are any similar questions, and if there are, ask the user if they are okay with that similar question. Allow the user to set the threshold/fuzziness level. So let's say I had the question "Tell me about when Jesus Christ was born?" and another user had the question "Tell me about the birth of Jesus Christ?" hopefully, maybe with enough tolerance level a lexical comparison could match these together. 
    - Honestly I think scaling could get pretty bad for this one. When a user asks a question it performs a symmetric embedding search/calculation via supbase edge functions. 
    The supabase edge functions I don't think are meant for a lot of users. So since I'm using those, we can get some concurrency issues when I have lots of users trying to do some pgvector similiarty calculations. I've been asking ai about it, and it suggests to add composite indexes which help speed up things especially when there are filters by books, chapters, etc. I can also use pgBouncer to help manage and distribute the connections. 
    -Another idea to help mitigate high concurrency is to use supabase transaction pooling that makes teh edge functions only hold onto a connection as long as it needs to do execute the query. So connections are resused across all requests as opposed to 1 connection per request. 
    -Another thing is to make sure I'm not doing multiple query statements in a row. Like avoid: 
    await db.query("SELECT * FROM chunks WHERE id = $1");
    await db.query("SELECT * FROM metadata WHERE id = $1");
    await db.query("SELECT ... vector search ...");

    and instead: 

    SELECT c.*, m.*
    FROM chunks c
    JOIN metadata m ON m.id = c.id
    WHERE c.book_id = $1
    ORDER BY c.embedding <=> $vector
    LIMIT 20;




