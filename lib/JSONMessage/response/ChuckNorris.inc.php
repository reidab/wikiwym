<?php
/**
    A JSONResponse class which returns a random bit of Chuck Norris
    wisdom.

    Response payload structure depends on request.

    If request->getPayload() is an array containing a 'fetchAll'
    value evaluating to true then the response structure is:

    @code
    {
    credits: { originalListAuthor:string, originalURL:string },
    quotes: [ string1 ... stringN ]
    }
    @endcode

    Otherwise the payload is structured like:

    @code
    {
    quote:string,  // Chuck trivia/quote/wisdom
    number:int,  // the index of the quote in the underlying db
    of:int // the number of quotes in the db
    }
    @endcode

    e.g.

    @code
    var p = response.payload();
    print( "Quote #"+p.number+" of "+p.of+": "+p.quote);
    @endcode
*/
class JSONResponse_ChuckNorris extends JSONResponse
{
    const ClassName = __CLASS__;
    private static $_quotes = NULL;

    public static function quotes()
    {
        if( ! self::$_quotes )
        {
            /**
             Original list Author : Brandon Checketts
             Homepage: http://www.apeleon.net/~microbit/brandon.html
            */

            $ar = array();
            $ar[] = "Some kids piss their name in the snow. Chuck Norris can piss his name into concrete.";
            $ar[] = "Chuck Norris' calendar goes straight from March 31st to April 2nd; no one fools Chuck Norris.";
            $ar[] = "Leading hand sanitizers claim they can kill 99.9 percent of germs. Chuck Norris can kill 100 percent of whatever the fuck he wants.";
            $ar[] = "Chuck Norris counted to infinity - twice. ";
            $ar[] = "Chuck Norris once visited the Virgin Islands. They are now The Islands. ";
            $ar[] = "Chuck Norris' tears cure cancer. Too bad he has never cried. ";
            $ar[] = "Chuck Norris' tears cure cancer. Too bad he has never cried. ";
            $ar[] = "Chuck Norris can speak braille. ";
            $ar[] = "Chuck Norris died ten years ago, but the Grim Reaper can't get up the courage to tell him. ";
            $ar[] = "Once, while having sex in a tractor-trailer, part of Chuck Norris' sperm escaped and got into the engine. We now know this truck as Optimus Prime. ";
            $ar[] = "Superman owns a pair of Chuck Norris pajamas. ";
            $ar[] = "Chuck Norris puts the laughter in manslaughter. ";
            $ar[] = "Chuck Norris does not sleep. He waits. ";
            $ar[] = "Chuck Norris owns the greatest Poker Face of all-time. It helped him win the 1983 World Series of Poker despite him holding just a Joker, a Get out of Jail Free Monopoly card, a 2 of clubs, 7 of spades and a green #4 card from the game Uno. ";
            $ar[] = "Chuck Norris can slam revolving doors. ";
            $ar[] = "Chuck Norris doesn't pop his collar, his shirts just get erections when they touch his body. ";
            $ar[] = "Chuck Norris sleeps with a night light. Not because Chuck Norris is afraid of the dark, but the dark is afraid of Chuck Norris ";
            $ar[] = "Chuck Norris does not hunt because the word hunting implies the possibility of failure. Chuck Norris goes killing. ";
            $ar[] = "Chuck Norris doesn't read books. He stares them down until he gets the information he wants. ";
            $ar[] = "Chuck Norris was once on Celebrity Wheel of ChuckNorris and was the first to spin. The next 29 minutes of the show consisted of everyone standing around awkwardly, waiting for the wheel to stop. ";
            $ar[] = "Once a cobra bit Chuck Norris' leg. After five days of excruciating pain, the cobra died. ";
            $ar[] = "Chuck Norris divides by zero. ";
            $ar[] = "Chuck Norris' wristwatch has no numbers on it. It just says, Time to kick ass. ";
            $ar[] = "When Chuck Norris gives you the finger, he's telling you how many seconds you have left to live. ";
            $ar[] = "Chuck Norris is not hung like a horse... horses are hung like Chuck Norris ";
            $ar[] = "Chuck Norris doesn't have hair on his testicles, because hair does not grow on steel. ";
            $ar[] = "Chuck Norris is 1/8th Cherokee. This has nothing to do with ancestry, the man ate a fucking Indian. ";
            $ar[] = "Chuck Norris' dog is trained to pick up his own poop because Chuck Norris will not take shit from anyone. ";
            $ar[] = "Chuck Norris is always on top during sex because Chuck Norris never fucks up. ";
            $ar[] = "Bill Gates lives in constant fear that Chuck Norris' PC will crash. ";
            $ar[] = "When the Boogeyman goes to sleep every night he checks his closet for Chuck Norris. ";
            $ar[] = "If it looks like chicken, tastes like chicken, and feels like chicken but Chuck Norris says its beef, then it's fucking beef. ";
            $ar[] = "Giraffes were created when Chuck Norris uppercutted a horse. ";
            $ar[] = "Ghosts are actually caused by Chuck Norris killing people faster than Death can process them. ";
            $ar[] = "When Chuck Norris looks in a mirror the mirror shatters, because not even glass is stupid enough to get in between Chuck Norris and Chuck Norris. ";
            $ar[] = "Chuck Norris is the only person on the planet that can kick you in the back of the face. ";
            $ar[] = "Chuck Norris has to maintain a concealed weapon license in all 50 states in order to legally wear pants. ";
            $ar[] = "Chuck Norris doesn't use pickup lines, he simply says, Now. ";
            $ar[] = "When Chuck Norris exercises, the machine gets stronger. ";
            $ar[] = "Chuck Norris sold his soul to the devil for his rugged good looks and unparalleled martial arts ability. Shortly after the transaction was finalized, Chuck roundhouse kicked the devil in the face and took his soul back. The devil, who appreciates irony, couldn't stay mad and admitted he should have seen it coming. They now play poker every second Wednesday of the month. ";
            $ar[] = "Chuck Norris can build a snowman out of rain. ";
            $ar[] = "The only thing Mr. T, Vin Diesel and Chuck Norris can agree on is that Tom Cruise is a faggot. ";
            $ar[] = "When an episode of Walker Texas Ranger was aired in France, the French surrendered to Chuck Norris just to be on the safe side. ";
            $ar[] = "M.C. Hammer learned the hard way that Chuck Norris can touch this. ";
            $ar[] = "Chuck Norris once had a heart attack; his heart lost. ";
            $ar[] = "Chuck Norris likes to knit sweaters in his free time. And by knit, I mean kick, and by sweaters, I mean babies. ";
            $ar[] = "The phrase, You are what you eat cannot be true based on the amount of pussy Chuck Norris eats. ";
            $ar[] = "Chuck Norris was originally offered the role as Frodo in Lord of the Rings. He declined because, Only a pussy would need three movies to destroy a piece of jewelery. ";
            $ar[] = "Pinatas were made in an attempt to get Chuck Norris to stop kicking the people of Mexico. Sadly this backfired, as all it has resulted in is Chuck Norris now looking for candy after he kicks his victims. ";
            $ar[] = "Chuck Norris plays russian roulette with a fully loded revolver... and wins. ";
            $ar[] = "Chuck Norris once killed a bird by throwing it off a cliff. ";
            $ar[] = "Chuck Norris can kill two stones with one bird. ";
            $ar[] = "Chuck Norris once punched a man in the soul. ";
            $ar[] = "If you can see Chuck Norris, he can see you. If you can't see Chuck Norris you may be only seconds away from death. ";
            $ar[] = "There are no weapons of Mass Destruction in Iraq. Chuck Norris lives in Oklahoma. ";
            $ar[] = "The only reason Chuck Norris didn't win an Oscar for his performance in Sidekicks is because nobody in their right mind would willingly give Chuck Norris a blunt metal object. That's just suicide. ";
            $ar[] = "Chuck Norris is currently suing NBC, claiming Law and Order are trademarked names for his left and right legs. ";
            $ar[] = "Chuck Norris once had an erection while lying face down. He struck oil. ";
            $ar[] = "The chief export of Chuck Norris is pain. ";
            $ar[] = "Chuck Norris did that to Michael Jackson's face. ";
            $ar[] = "The quickest way to a man's heart is with Chuck Norris's fist. ";
            $ar[] = "It is considered a great accomplishment to go down Niagara Falls in a wooden barrel. Chuck Norris can go up Niagara Falls in a cardboard box. ";
            $ar[] = "Upon hearing that his good friend, Lance Armstrong, lost his testicles to cancer, Chuck Norris donated one of his to Lance. With just one of Chuck's nuts, Lance was able to win the Tour De France seven times. By the way, Chuck still has two testicles; either he was able to produce a new one simply by flexing, or he had three to begin with. No one knows for sure. ";
            $ar[] = "The best part of waking up is not Folgers in your cup, but knowing that Chuck Norris didn't kill you in your sleep. ";
            $ar[] = "Touching Chuck Norris' beard will increase you life expectancy by 6 years. Unfortunately, the following roundhouse kick will reduce your life expectancy by 300. You do the math. ";
            $ar[] = "A Handicap parking sign does not signify that this spot is for handicapped people. It is actually in fact a warning, that the spot belongs to Chuck Norris and that you will be handicapped if you park there. ";
            $ar[] = "The grass is always greener on the other side, unless Chuck Norris has been there. In that case the grass is most likely soaked in blood and tears. ";
            $ar[] = "If Chuck Norris makes a woman ride on top during sex, she instantly qualifies for the mile high club. ";
            $ar[] = "The most honorable way of dying is taking a bullet for Chuck Norris. This amuses Chuck Norris because he is bulletproof. ";
            $ar[] = "The saddest moment for a child is not when he learns Santa Claus isn't real, it's when he learns Chuck Norris is. ";
            $ar[] = "When a tsunami happens, it�s because Chuck Norris has been swimming laps in the ocean. ";
            $ar[] = "Why did the chicken cross the road? Because Chuck Norris threw it. ";
            $ar[] = "Chuck Norris has a pet kitten - every night for a snack. ";
            $ar[] = "Chuck Norris does not sleep. He waits. ";
            $ar[] = "Chuck Norris is currently suing NBC, claiming Law and Order are trademarked names for his left and right legs. ";
            $ar[] = "If you can see Chuck Norris, he can see you. If you can�t see Chuck Norris you may be only seconds away from death. ";
            $ar[] = "There are no disabled people. Only people who have met Chuck Norris. ";
            $ar[] = "In fine print on the last page of the Guinness Book of World Records it notes that all world records are held by Chuck Norris, and those listed in the book are simply the closest anyone has ever gotten. ";
            $ar[] = "In an average living room there are 1,242 objects Chuck Norris could use to kill you, including the room itself. ";
            $ar[] = "Chuck Norris is the only man to ever defeat a brick wall in a game of tennis. ";
            $ar[] = "Chuck Norris is the reason why Waldo is hiding. ";
            $ar[] = "When Chuck Norris runs with scissors, other people get hurt.  ";
            $ar[] = "Chuck Norris drives an ice cream truck covered in human skulls.  ";
            $ar[] = "Chuck Norris was once the F.B.I's chief negotiator. His job involved calling up criminals and saying, This is Chuck Norris. ";
            $ar[] = "The reason newborn babies cry is because they know they have just entered a world with Chuck Norris. ";
            $ar[] = "When Chuck Norris breaks the law, the law doesn't heal. ";
            $ar[] = "Chuck Norris does not know where you live, but he knows where you will die. ";
            $ar[] = "Rosa Parks refused to get out of her seat because she was saving it for Chuck Norris. ";
            $ar[] = "Before Chuck Norris was born, the martial arts weapons with two pieces of wood connected by a chain were called NunBarrys. No one ever did find out what happened to Barry. ";
            $ar[] = "A unicorn once kicked Chuck Norris. That is why they no longer exist. ";
            $ar[] = "When Chuck Norris answers the phone, he just says Go. This is not permission for you to begin speaking, it is your cue to start running for your life. ";
            $ar[] = "Chuck Norris once partook in a pissing contest outside of a bar. His opponent drowned. ";
            $ar[] = "When Chuck Norris jumped into the ocean, he didn't get wet, the water got Chuck Norris'ed. ";
            $ar[] = "God said: Let there be light. Chuck Norris said: Say please! ";
            $ar[] = "Chuck Norris can satisfy a woman by pointing at her with his finger and saying Booya ";
            $ar[] = "Chuckie is Chuck Norris' gay brother. ";
            $ar[] = "Facebook was created for counting how many people left to be roundhouse kicked. ";
            $ar[] = "Chuck Norris tells black jokes without looking over his shoulder ";
            $ar[] = "Chuck Norris was about to send an email when he realized it'd be faster to run. ";
            $ar[] = "It's not the fall that kills you, It's Chuck Norris waiting for you at the bottom ";
            $ar[] = "Chuck Norris has slept with the girl in your sex dreams. ";
            $ar[] = "Chuck Norris is so fast he can start a fire by rubbing two ice cubes together. ";
            $ar[] = "That's not an eclipse, that's the sun hiding from Chuck Norris. ";
            $ar[] = "Teenage Mutant Ninja Turtles is in fact based on a true story. Chuck Norris once ate a live turtle, and when he crapped it out, it was six feet tall and knew karate. ";
            $ar[] = "Chuck Norris won a staring contest with the sun. Two feet away. ";
            $ar[] = "Deaf people did not exist until Chuck Norris was asked to speak a little louder at the McDonalds drive through. ";
            $ar[] = "Chuck Norris was once having sex with a tractor trailer, when some of his sperm got into the cab. Nine months later, the tractor trailer gave birth to Optimus Prime. ";
            $ar[] = "Chuck Norris won a staring contest against his reflection. ";
            $ar[] = "If you see Chuck Norris fighting a bear, don't help Chuck Norris, help the bear. ";
            $ar[] = "Chuck norris doesnt teabag people he potatosacks them ";
            $ar[] = "Chuck Norris lost his virginity before his dad did. ";
            $ar[] = "There was once a 51st state, known as New Idaho.  It has not been heard of since it snubbed Chuck Norris as governor and was roundhouse kicked into a parallel dimension, along with Chuck's virginity and the last sonofabitch that overcooked his panda bear steaks.  Chuck Norris eats his panda raw. ";
            $ar[] = "The North American Bison nearly went extinct because Chuck Norris needed a leather jacket. ";
            $ar[] = "Chuck Norris made a deal with the Devil.  The deal: Chuck Norris will only kick the Devil's ass once per day, in exchange for Satan's soul. ";
            $ar[] = "Don't even ask. Chuck Norris is always serious. ";
            $ar[] = "Chuck Norris...End of Story ";
            $ar[] = "When Chuck Norris was little he followed a rainbow. He met a leprechaun and asked for its gold. It wouldn't give it to him. This is why we no longer have leprechauns. ";
            $ar[] = "The President has Chuck Norris on speed dial...on the red phone ";
            $ar[] = "If you misspell Chuck Norris on Google it won't correct it, it just says you have 10 seconds to live. ";
            $ar[] = "Chuck Norris once played a game of golf without clubs. He shot a 17. ";
            $ar[] = "When Chuck Norris went to donate sperm, half the nurses drowned; the rest were pregnant. ";
            $ar[] = "When Chuck Norris was born he roundhouse-kicked the doctor dead for hitting his butt. ";
            $ar[] = "Chuck Norris created all the accents in the world by punching everybody in the throat each in a different way. ";
            $ar[] = "B.C. really stands for Before Chuck. ";
            $ar[] = "The Big Bang happened when Chuck Norris went back in time to just before the Universe began and every atom in the Universe immediately decided it should get the hell away from there and fast. ";
            $ar[] = "Chuck Norris has no home security system. Chuck Norris welcomes intruders.  ";
            $ar[] = "Chuck Norris has the eyes of an angel and the soul of a saint.  He keeps them in a footlocker under his bed. ";
            self::$_quotes = $ar;
        }
        return self::$_quotes;
    }
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $a = array();
        $q = self::quotes();
        $respay = $req->getPayload();
        if( $respay && @is_array( $respay ) && @$respay['fetchAll'] )
        {
            $a['credits'] = array(
                                  'originalListAuthor' => 'Brandon Checketts',
                                  'originalURL' => 'http://www.apeleon.net/~microbit/brandon.html'
                                  );
            $a['quotes'] = $q;
        }
        else
        {
            $c = count($q);
            $n = $c ? rand(0,$c-1) : 0;
            $a['quote'] = $q[$n];
            $a['number'] = $n;
            $a['of'] = $c;
        }
        $this->setPayload( $a );
    }
}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_ChuckNorris::ClassName );
?>
