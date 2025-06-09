Hello and Welcome to Shark's Counters


🟢===================================== TO GET STARTED ========================================🟢

get a "allow" block
/give @s allow 

interact with the allow block
(right click/trigger)

the first person to interact with the menu (allow) will be promted to become "Owner"

Owner will have the power to decide the menu settings 
such as who else has access to admin settings and who else is considered "Owner"


the "player menu" default item is "minecraft:stick"
the "admin menu" default is "minecraft:allow"




🟢========================================= PLAYER MENU ==========================================================🟢

when you open the player menu you will see three buttons

you can toggle the buttons off in admin settings for each button

"Personal Stats"
"Global Stats"
"Leaderboard"


🟢======================================= "Personal Stats" ======================================================🟢
shows a list of scores for each player

the list of scores can be toggled and managed inside the admin menu /player menu/ edit personal stats

colors adjusted in admin/default counters/ manage default counters

the objectives are as follows

you can add aditional custom scores to list using admin menu




the objectives are as follows


menu label = objective name

Currency                   = is set to whatever you want to set it as using admin menu default "money"
Kills                      = kills
Kill Coins                 = kill_coins
Deaths                     = deaths
Kill Death Ratio           = is not a score
Monster Kills              = monster_kills
Mob Kills:                 = mob_kills
Blocks Broken              = blocks_broken
Blocks Placed              = blocks_placed
Blocks Broken/Placed Ratio = is not a score
Playtime                   = playtime_seconds, playtime_minutes, playtime_hours, playtime_days (these do not condense so a player might have 180 minutes and 3 hours these are the same value )
Distance                   = distance_traveled
Chests Opened              = containers_opened
Times Joined               = playerJoin


🟢============================================ "Global Stats" ==================================================🟢



shows a list of worldwide stats it takes any of the default counter scores and adds up all players scores globally
you can toggle them on/off in admin menu/player menu/ edit global stats 
also can change colors in the default config menu


dummyPlayer: "total_kills",              objective: "total_kills",               label: "Global PvP Kills" 
dummyPlayer: "total_deaths",             objective: "total_deaths",              label: "Global Deaths" 
dummyPlayer: "total_kill_coins",         objective: "total_kill_coins",          label: "Global kCoins" 
dummyPlayer: "total_monster_kills",      objective: "total_monster_kills",       label: "Global Monster Kills" 
dummyPlayer: "total_mob_kills",          objective: "total_mob_kills",           label: "Global Mob Kills" 
dummyPlayer: "total_blocks_placed",      objective: "total_blocks_placed",       label: "Global Blocks Placed" 
dummyPlayer: "total_blocks_broken",      objective: "total_blocks_broken",       label: "Global Blocks Broken" 
dummyPlayer: "total_distance",           objective: "total_distance",            label: "Global Distance Traveled"
dummyPlayer: "total_playtime",           objective: "total_playtime",            label: "Global Playtime" 
dummyPlayer: "total_containers_opened",  objective: "total_containers_opened",   label: "Global Chests Opened" 
dummyPlayer: "total_players_joined",     objective: "total_players_joined",      label: "Global Times Joined" 
dummyPlayer: "total_players",            objective: "totalPlayers",              label: "Total Players Joined"



🟢=============================================== Leaderboards ===============================================🟢

the setings for leaderboard is also like admin settings/ player menu/ edit leaderbaords

there you can set a "leaderboard limit" which is how many players are visible per loaderboard

you can toggle a list of default scores on and off and you can add custom scores to the list

a leaderboard will automatically keep offline players scores!

the way that this works is it makes an additional "offlineObjective" 
and it sets you to a fake name on that objective that matches your real name

if you add a custom score should be stored like "yourName_offline"

 Default Offline Score Objectives match up with liveObjectives from personal stats:
   
    liveObjective:     you choose objective in menu default is "money",
    offlineObjective: `${objective}_offline`,
    label:             "Currency"
  
  {
              
    liveObjective:    "kills",              
    offlineObjective: "kills_offline",     
    label:            "PvP Kills"
  },
  {  
    
    liveObjective:  "deaths",
    offlineObjective:"deaths_offline",
    label:          "Deaths"
  },
  {
    
    liveObjective:  "kill_coins",
    offlineObjective:"kill_coins_offline",
    label:          "Kill Coins"
  },
  {
    
    liveObjective:     "monster_kills",
    offlineObjective:  "monster_kills_offline",
    label:             "Monster Kills"
  },
  {
    
    
    liveObjective:     "mob_kills",
    offlineObjective:  "mob_kills_offline",
    label:             "Mob Kills"
  },
  {
    
    liveObjective:    "blocks_placed",
    offlineObjective: "blocks_placed_offline",
    label:            "Blocks Placed"
  },
  {
    
    liveObjective:      "blocks_broken",
    offlineObjective:   "blocks_broken_offline",
    label:              "Blocks Broken"
  },
  {
    
    liveObjective:     "distance_traveled",
    offlineObjective:  "distance_traveled_offline",
    label:             "Distance Traveled"
  },
  {
    
    liveObjective:      "playtime_seconds",
    offlineObjective:   "playtime_seconds_offline",
    label:              "Playtime"
  },
  {
    
    liveObjective:      "containers_opened",
    offlineObjective:   "containers_opened_offline",
    label:              "Chests Opened"
  },
  {
    
    liveObjective:      "playerJoin",
    offlineObjective:   "playerJoin_offline",
    label:              "Times Joined"
  }



🟢========================================= Admin Menu ==========================================================🟢

when opening the admin menu your options will be:

Default Counters
Custom Counters 
Score Ratios
Score Rewards
Logs 
Admin settings


🟢 ======================================= Deafult Counters ================================================🟢


will have two options

Manage Default Counters
Action Bar Settings


--------------------Manage Default Counters--------------------------------

inside manage default counters there is a whole list of scores you can toggle on and off 

Score Enabled:
if a score is toggled "enabled" then it will count for you


Action Bar Enabled:
if the Action Bar is enabled it will show that score on the action bar when a score is made
action bars can conflict and some of them are constant like playitme coordinates and distance
if the global action bar is enabled then the individual ones here do not show at all


Format Code:
the action bar format code means the color symbol §
valid § entrys are lowercase a-u and numeric 0-9
the color will effect the action bar, and also player menu displays 


Currency can be set to any objective name you want as well


obectives are same as player menu with additon of coordinates objectives

Currency                   = is set to whatever you want to set it as using admin menu default "money"
Kills                      = kills
Kill Coins                 = kill_coins
Deaths                     = deaths
Kill Death Ratio           = is not a score
Monster Kills              = monster_kills
Mob Kills:                 = mob_kills
Blocks Broken              = blocks_broken
Blocks Placed              = blocks_placed
Blocks Broken/Placed Ratio = is not a score
Playtime                   = playtime_seconds, playtime_minutes, playtime_hours, playtime_days (these do not condense so a player might have 180 minutes and 3 hours these are the same value )
Distance                   = distance_traveled
Chests Opened              = containers_opened
Times Joined               = playerJoin
Coordinates                = coord_x,coord_y,coord_z


//-------------------------Action Bar Settings---------------------------------------

this handles what i call the "global action bar"

the action bar can store any combination of the default scores here including the Ratios
any of the "action bar" togggles from other menu will show up here in a list and the format code applies also

-Global Action Bar Enabled-
if global action bar is enabled then it will override the other action bars from defaults and show as a combined constant list

-Player Name-
you can toggle if the player name displays and what color format it gets


-Global Action Bar Format-
will apply to all lines r is default but you could use l for bold text

-Player Tag Filter-

you may list tags here by seperating them with comma 

!tag means its excluded

example:

member,!admin

means that a player with tag=member,tag=!admin

so member is included admin excluded

-Player Score Objective-

you can require a player has a score on a certian objective here

player score range accepts a single score or a range like this 

1 or 1.. or ..1 or 1..10 

-Location Filter-
if toggled enabled then this will check if a players location matches this range

ranges are typed like this 

x..x,y..y,z..z

so range with comma sperated

example 

-100..100,-100..100,-100..100



🟢 ======================================= Custom Counters ============================================== 🟢 

this section of the counters is quite in depth and you can set any parameter you want for each counter

you can make as many of each type as you wih and they will all run side by side

to start off there are 7 types of custom counters you can make

PvP Kill Counter
Entity Kill Counter
Death Counter
Container Counter
Block Counter (Broken or Placed)
Playtime Counter
Distance Counter


if you already have any custom counters they will be listed here
click "add new counter" and youl be asked to choose a type

choose your counter type and then a counter name the name will be whats shown in menu


🟢 ================================== PvP Kill Counter ================================= 🟢

once chooosing pvp type you will get a menu to edit details of the menu

-Enabled-

there will be a toggle for if the counter is enabled

-Action Bar Enabled-
toggles weather action bar shows when a point is made

-Action Bar Format Code-
controls how action bar color appears using § 
valid entrys are lowercase "a-u" and numeric "0-9"



Killer Score Enabled: Whether to apply a score to the killer.

Killer Score Objective Name(s): Scoreboard objective(s) to modify. Accepts comma-separated list.

Killer Display Name(s): Human-friendly labels (matches objective list order).

Killer Increment Score Amount: Range syntax for how much score to apply (e.g. 1, 1..5, ..3, !5).

Killer Score Mode: Choose between "Add Score" or "Remove Score".

Allow Negative Numbers (Killer): Allow the killer's score to drop below zero.

Execute Command as Killer: Optional command to run as killer, supports {killer} and {victim} placeholders.


Victim Required Tags: Similar to killer tags, but for the entity that died.

Victim Required Score Objective(s): Same concept as killer score filter.

Victim Required Score Range: Score requirement for the victim.


Victim Score Objective(s): Scoreboard objective(s) to modify for the victim.

Victim Score Display Name(s): Human-readable display names.

Victim Score Amount: Range for how much to add/remove.

Enable Victim Score: Toggle whether to score the victim.

Victim Score Mode: Add or remove score.

Allow Negative Numbers (Victim): Allow victim’s score to go negative.

Execute Command as Victim: Optional command to run as the victim.

Location & Filtering
Kill Location Enabled: Enables filtering based on death coordinates.

Kill Location (x, y, z): Accepts range syntax (e.g. -100..100).

Dimension Filter: (in a different menu, not in this UI) restricts to ["overworld", "nether", "the_end"].

Debug Log To Console: Logs debug info to the console.

Log To Menu: Adds PvP events to the admin log menu.

Send Players Messages: Sends success messages to killer.

Send Killer Player Debug Messages: Sends failure/diagnostics to killer.

Send Victim Last Death Coords: Shows death location to the victim.

Teleport Victim To Last Death Coords: Will teleport them on respawn.


🟢 ============================== Entity Kill Counter ======================================= 🟢


Counter Enabled	Toggles whether this kill counter is active.

Action Bar Enabled	Show score updates in the action bar.

Action Bar Format Code	One-character format code for color/style (e.g., c, e, 6, r).

Trident Killers Enabled	Whether trident kills are counted (disable to ignore thrown tridents).

Score Objective Name(s)	Comma-separated objective ID(s) to track score.

Display Name(s)	Comma-separated display name(s) to match objectives (human-readable).

Increment Killer Score Amount	Score to apply: a single number (5) or a range (1..3).

Killer Score Mode	Whether to Add Score or Remove Score.

Allow Negative Numbers (Killer)	Whether scores can drop below zero.

Execute Command as Killer	Optional command run as the killer, supports {killer} and {victim} tokens.

Killer Required Tags	Tags the killer must have; prefix with ! to exclude (e.g., vip,!noPvp).

Victim Required Tags	Tags the victim must have; works like above.

Killer Required Score Objective(s)	Objective(s) for killer filtering (e.g., team names).

Killer Required Score Range	Range filter using formats like 1, 1.., ..5, !1, !1..5.

Item Type Filter	List of accepted or blocked item IDs in killer’s hand (e.g., minecraft:bow,!minecraft:trident).

Victim Required Score Objective(s)	Score objectives to check on the victim.

Victim Required Score Range	Same syntax as killer score range.

Victim Entity Types	Type IDs to include/exclude (e.g., minecraft:zombie,!minecraft:skeleton).

Victim Entity Families	Family names (e.g., monster,!undead).

Kill Location Enabled	Whether location-based filtering is enabled.

Kill Location (x, y, z)	Coordinate filters in format x..x,y..y,z..z (supports exclusion via !).

Debug Log To Console	Sends internal logs to server console.

Send Players Messages	Sends friendly success messages to the killer.

Send Players Debug Messages	Sends detailed debug info to the killer (useful for testing).

Log To Menu	Adds kills to a persistent in-game log (not recommended for frequent events).


🟢 ======================================== Deaths Counter ================================================ 🟢

when you select death counter you first will choose a death cause filter

a list of all death type toggles is provided if youi toggle them enabled then it will count towards a score
if you enable the entityAttack then additional filters will be provided in the edit UI form 

Counter Enabled – toggle

Action Bar Enabled – toggle

Action Bar Format Code – single char code (e.g., c, 6, etc.)

Victim Score Objective(s) – comma list

Victim Score Display Name(s) – comma list

Victim Score Increment Amount – number or range (e.g., 1..5)

Victim Score Mode – dropdown: Add / Remove

Allow Negative Numbers – toggle

Execute Command as Victim – text input (e.g. /clear @s)

Victim Required Tags – tag list (e.g., !immune)

Victim Required Score Objective(s) – name(s)

Victim Required Score Range – range or exclude (e.g., 1..5, !1..)


 Killer-Specific Fields (entityAttack Mode Only)
Require Killer To Be Player – toggle

Killer Entity Family – list (e.g., monster, !undead)

Killer Entity Type – list (e.g., minecraft:zombie)

Killer Required Tags – list

Killer Required Score Objectives – name(s)

Killer Required Score Range – range/exclude

Item Type Filter – list (e.g., minecraft:diamond_sword, !wooden_axe)

Death Location Enabled – toggle

Death Location – x,y,z or x..x,y..y,z..z

Debug Log To Console – toggle

Send Players Messages – toggle

Send Players Debug Messages – toggle

Log To Menu – toggle

Send Victim Last Death Coords – toggle

Teleport Victim To Last Death Coords – toggle

🟢 ======================================== Container Counter ================================================ 🟢

when you edit a container counter first a vist of any valid vanilla containers will appear

you can toggle them to enabled/disabled

and also you can type in a custom block name if you have one with the "minecraft:inventory" component

then you will arrive at the edit form

Counter Enabled — toggle

Action Bar Enabled — toggle

Action Bar Format Code — 1-character code (e.g. c, 6, r)

Score Objective(s) — comma-separated list (e.g. chest_open)

Score Display Name(s) — comma-separated list (e.g. Chests)

Increment Amount — single value or range (e.g. 1, 1..3)

Score Mode — dropdown: Add Score / Remove Score

Allow Negative Numbers — toggle

Position Filter Enabled — toggle

Position Ranges (x..x,y..y,z..z) — comma-separated ranges per axis

Player Required Tag Filters — include/exclude syntax (e.g. !noTrack,admin)

Player Required Score Objective — string (e.g. playtime)

Player Required Score Range — formatted as min..max or !min..max

⚙️ Runtime Options
Execute Command as Player — optional command to run on open (/give @s diamond)

Log To Menu — toggle for saving entry to in-game log

Debug Log To Console — toggle for console output

Send Players Messages — toggle for user-facing feedback

Send Players Debug Messages — toggle for verbose failure reason messages

🟢 ======================================== Block Counter =============================================🟢 

when you choose block counter you first will choose a type "placed" or "broken"

each of which has its own UI



Counter Enabled — toggle the counter on/off.

Action Bar Enabled — show score feedback.

Action Bar Format Code — single char (e.g., a, 6, r).

Score Objective(s) — comma-separated list.

Score Display Name(s) — names shown on the scoreboard.

Player Score Amount — number or range (e.g. 1..5).

Score Mode — dropdown: Add Score / Remove Score.

Allow Negative Numbers — prevents scores from dropping below zero.

Execute Command as Player — optional (e.g., /give @s dirt).


Block Type Filters — supports inclusion/exclusion (e.g., minecraft:stone, !minecraft:air).

Block Location Enabled — toggle location filtering.

Block Location — x, y, z ranges (e.g., -5..5,60..70,100..100).


Player Required Tags — comma-separated, support !tag exclusions.

Player Required Score Objectives — name(s) of objectives.

Player Required Score Range — e.g., 1.., ..10, or !1..3.

Debug Log To Console — output debug to console.

Send Players Messages — send feedback on success.

Send Players Debug Messages — show reasons for failure.

Log To Menu — append result to in-game log.

Replace Broken Block (break form only) — restores the block post-break.

Remove Placed Block (place form only) — removes block after placing and gives item back.





Unique Behaviors
Block-specific toggles:

Block break counters use: blockBreakEnabled, replaceBrokenBlock

Block place counters use: blockPlaceEnabled, removePlacedBlock

Held Item Filter (for breaks): restricts which tools are valid for counting



🟢 ======================================== Playtime Counter =============================================🟢 

Counter Enabled	Whether the counter is active or disabled.

Player Tag Filters	Optional list of tags to include or exclude players. Use !tag to exclude.

Player Score Objective	The scoreboard objective used in score filtering.

Player Score Range	Range format (1..10, ..50, 5..) to limit tracked players by score.

Position Filter Enabled	Enable filtering by player location.

Position Ranges (x,y,z)	Required if position filter is enabled. Format: x..x,y..y,z..z.

Seconds Objective Name	Scoreboard ID for seconds tracked.

Seconds Display Name	Human-friendly label for seconds.

Show Seconds Score	Toggle whether seconds should be displayed.

Minutes Objective Name	Scoreboard ID for minutes tracked.

Minutes Display Name	Human-friendly label for minutes.

Show Minutes Score	Toggle whether minutes should be displayed.

Hours Objective Name	Scoreboard ID for hours tracked.

Hours Display Name	Human-friendly label for hours.

Show Hours Score	Toggle whether hours should be displayed.

Days Objective Name	Scoreboard ID for days tracked.

Days Display Name	Human-friendly label for days.

Show Days Score	Toggle whether days should be displayed.

Increment Amount	How much score to add per update. Use 1 or a range like 1..5.

Score Mode	Whether to Add Score or Remove Score on each update.

Allow Negative Numbers	Whether scores can fall below zero.

Action Bar Enabled	Whether to show a live update via action bar.

Action Bar Format Code	Color/style for action bar. Single character like a, b, 4, etc.

Action Bar Label	Prefix label to show before playtime values (e.g., Playtime:).

Playtime Limit (seconds)	Optional cap. If reached, command runs and score stops updating.

Execute Command as Player	Command that runs when limit is hit (e.g., /say Congrats).

Reset On Logout	Whether the counter resets to 0 when the player leaves the game.

Log To Menu	If enabled, sends counter events to admin log menu.

Debug Log To Console	Sends debug info to scripting log.

Send Players Messages	If true, sends visible messages to players for success events.

Send Players Debug Messages	Sends player debug messages on skipped or failed filters.


🟢 ======================================== Distance Counter =============================================🟢 

Counter Enabled	Whether the counter is active or not.

Player Required Tag Filters	List of required or excluded tags (use !tag to exclude).

Player Required Score Objective	Scoreboard objective players must meet to be tracked.

Player Required Score Range	Range format (1..10, ..100, etc.) to filter eligible players.

Position Filter Enabled	If enabled, only players within a specified location range will be tracked.

Position Ranges (x,y,z)	Required if filter is on. Format: x..x,y..y,z..z (e.g. -50..50,60..80,-100..100).

X Axis Enabled	Whether X-axis movement should be tracked.

Y Axis Enabled	Whether Y-axis (vertical) movement should be tracked.

Z Axis Enabled	Whether Z-axis movement should be tracked.

Objective Name	Internal scoreboard objective ID to store total distance.

Display Name	Friendly display name shown on scoreboard lists.

Display Format	How values are displayed: blocks, hundreds, thousands, million.

Increment Amount	Amount to increase score per tracked step. Can be single value or a range.

Score Mode	Whether to Add or Remove score when movement occurs.

Allow Negative Numbers	Allow score to go below zero when removing values.

Action Bar Enabled	Whether to show movement values on-screen via action bar.

Action Bar Format Code	A single color/style code (a to u, or 0 to 9).

Action Bar Label	Optional prefix shown before the live score in the action bar.

Distance Limit	Cap on total distance tracked. Set 0 to disable the cap.

Execute Command as Player	Optional command run when distance limit is reached.

Log To Menu	Logs counter activity to the in-game admin log menu.

Debug Log To Console	Outputs debug info to the scripting console.

Send Players Messages	Sends regular message when counter updates occur.

Send Players Debug Messages	Sends message if player is skipped (filters not passed).


🟢 ======================================== Score Ratio  =============================================🟢 

score ratios are not a scoreboard as they are able to display in decimal values

but they are calculated using score objectives like this

numeratorObjective/denominatorObjective

so it will divide the numeratorObjective by the denominatorObjective and return a ratio

there is a built in action bar setup since these are not scores 
this is the only way to display a custom decimal ratio

or you can toggle Display Rounded for use in other displays



the ratio edit form includes:

Enabled	Whether this ratio is currently active.

Numerator Objective	First part of the ratio. Typically the larger value (e.g., kills).

Denominator Objective	Second part of the ratio. Typically the smaller value (e.g., deaths).

Display Name	Human-friendly name shown in scoreboard menus.

Ratio ID	Unique ID with no spaces (e.g., kill_death). Used as the menu name.

Display Rounded (scoreboard)	Rounds the scoreboard display to nearest integer 
(use this to display a ratio in rounded form for things like sidebar or list or belowname).

Use ActionBar (decimal)	Displays the live ratio in the action bar as a decimal value for the custom actionbar.

ActionBar Label	Optional label shown above the ratio in the action bar (e.g., KD:).

ActionBar Label Format Code	Color/style format for the label (a–u, 0–9).

Numerator Format Code	Format code for the numerator in the scoreboard (a–u, 0–9).

Denominator Format Code	Format code for the denominator (a–u, 0–9).

ActionBar Ratio Format Code	Format code applied to the ratio value in the action bar.

ActionBar: Required Tags	Optional tag filters (comma-separated). Use !tag to exclude.

ActionBar: Required Score Objectives	Only show the ratio if player has these scoreboards (comma-separated).

ActionBar: Required Score Ranges	Match score ranges for any required objectives. Format: 1..10,5..


🟢 ======================================== Score Rewards  =============================================🟢 

These UIs allow admins to configure score-based rewards, triggered when players meet a defined score condition. There are two modes:

Once – One-time reward when the player hits an exact score.

Interval – Recurring reward triggered every step within a score range (e.g., every 100 kills).


you first will choose the reward name and the mode "once" or interval"

then each mode has a UI form

you can enable the reward or disble

each mode includes and "ascending" or "descending" mode
if you choose "ascending" then when points are added and a highr score is reached reward will trigger
if you choose "decending" then when points are removed and a lower score is reached reward will trigger

 Once Reward Fields
Field	Description
Enabled	Whether this reward is active.
Allow Negative Scores	Whether the player can qualify with a negative score.
Objective Name	Scoreboard objective to track.
Score Value	Exact value the player must reach to trigger the reward.
Tag Filter	List of required or excluded tags (use !tag to exclude).
Location Filter Enabled?	If true, limits rewards to players in a specific area.
Player Location	3D coordinate range. Format: x..x,y..y,z..z.
Required Score Objective	Additional objective the player must have a valid score in.
Required Score Range	Required score range in the above objective.
Send Message	Message to send the player when reward is given.
Run Command	Command to run (e.g., /give @s diamond 1).
Log To Menu	Logs the event in the admin counter menu.
Send Player Failure Messages	Shows debug message if the reward is skipped.
Log To Console	Logs the result to the scripting console.

Interval Reward Fields
Field	Description
Enabled	Whether this reward is active.
Mode	ascending triggers at increasing scores; descending at decreasing scores.
Allow Negative Scores	Whether the player can qualify with negative scores.
Objective Name	Scoreboard objective to track.
Score Step Value	The step interval (e.g., every 100 points).
Score Range	Range in which the reward can repeat (e.g., 100..1000).
Tag Filter	List of required or excluded tags.
Location Filter Enabled?	If true, limits rewards to players in a specific area.
Player Location	3D coordinate range. Format: x..x,y..y,z..z.
Required Score Objective(s)	One or more objectives that must exist.
Required Score Range	Range that must be met in the required objective(s).
Send Message	Message to send the player when triggered.
Run Command	Command to run when triggered.
Log To Menu	Logs the event in the admin counter menu.
Send Player Failure Messages	Shows debug message if the reward is skipped.
Log To Console	Logs the result to the scripting console.

Notes
Once rewards trigger only one time when the score matches exactly.

Interval rewards persist and can trigger multiple times as a player progresses through the score range (or regresses, in descending mode).

Tags, location, and required scores are optional filters that must all pass for the reward to activate.



🟢 ======================================== Logs  =============================================🟢 


Persistent Logs (stored via world.setDynamicProperty)

Custom Log Categories (PvP, join/leave, blocks, containers, rewards, etc.)

Log Viewing Menus

Configurable Log Limit

Type-based Filtering & Clearing

Runtime Join/Leave Auto-Logging

Log Settings Menu to toggle sources per log type



View Logs will sow you logs by type or all logs

clear logs will remove logs by type or all logs

set limit is the limit of logs to save in memory 
reccomaned max 200 as the logs contain alot of data

log settings will log 
pvp kills
playerJoin
playerLeave

if you toggle them it doesnt need a special cointer itl just always log these

the rest of the logs come from the "log to menu" toggles inside counters and rewards and such


🟢 ======================================== Admin Settings =============================================🟢 

"Item Settings"
"Player Menu Settings"
"Ban Settings"
"AFK Settings"
"Score Displays"
"Admin Settings"

🟢 ======================================== Item Settings =============================================🟢 

Admin Item Identifier	The item ID used to open the admin menu (default: "minecraft:allow").

Player Item Identifier	The item ID used to open the player menu (default: "minecraft:stick").

Require Admin Item Tag	If enabled, players must also have the Admin Item Tag on the item.

Require Player Item Tag	If enabled, players must also have the Player Item Tag on the item.

Admin Item Tag	Required tag on the admin item (e.g. admin_tool).

Player Item Tag	Required tag on the player item (e.g. player_tool).


🟢 ======================================== Player Menu Settings =============================================🟢 

"Edit Personal Stats"
"Edit Global Stats"
"Edit Leaderbaord"

these control what players see in the player Menu

each button can be toggled off/on

see the player menu info at top of readME for more info

----------------------------------- Personal Stats ------------------------------

Show Currency	Show the player's current currency or main score.
Show Kills	Show the player's total kills.
Show Deaths	Show total deaths.
Show Kill Coins	Display kill-based reward points.
Show KDR	Show kill/death ratio (if available).
Show Monster Kills	Display kills of hostile mobs (monsters).
Show Mob Kills	Include neutral/passive mob kills.
Show Blocks Broken	Track how many blocks the player has broken.
Show Blocks Placed	Show blocks placed by the player.
Show BPR	Blocks placed/broken ratio.
Show Time Played	Show how long the player has spent in-game.
Show Distance Traveled	Total movement distance tracked.
Show Chests Opened	How many chests the player has opened.
Custom Personal Stats Objectives	Comma-separated list of additional scoreboard objectives to show.

------------------------------------ Global Stats ---------------------------------------

Show Global Stats Button	Enables/disables the “Global Stats” button in the player UI.
Show PvP Kills	Displays the total number of PvP kills across all players.
Show Deaths	Displays the total number of player deaths.
Show Kill Coins	Shows total earned kill coins (if tracked).
Show Monster Kills	Total monster kills (e.g., creepers, skeletons, etc.).
Show Mob Kills	Generic mob kills (includes passive or neutral mobs).
Show Blocks Placed	Total blocks placed across all players.
Show Blocks Broken	Total blocks mined or broken.
Show Distance Traveled	Total movement distance tracked (e.g., steps walked).
Show Playtime	Total playtime of all players combined.
Show Chests Opened	Total chests opened.
Show Times Joined	Aggregates how many times all players have joined the world/server.
Show Total Players Joined	Displays the unique player count who have ever joined


------------------------------------Leader Board --------------------------------------


Enable Leaderboards Button	Shows or hides the "Leaderboards" button in the player menu.
Leaderboard Limit (1–100)	Max number of entries shown in each leaderboard.
Show PvP Kills	Include PvP kill stats in leaderboard.
Show Deaths	Include player death stats.
Show Kill Coins	Include "kill coin" score objective.
Show Monster Kills	Include monster kill stats.
Show Mob Kills	Include generic mob kill stats.
Show Blocks Broken	Include blocks broken stats.
Show Blocks Placed	Include blocks placed stats.
Show Distance Traveled	Include player movement distance stat.
Show Playtime	Include time played stat.
Show Chests Opened	Include how many chests a player has opened.
Show Times Joined	Include how many times a player has joined the game.
Custom Leaderboard Objectives	Comma-separated list of custom objective IDs to include as well.

🟢 ======================================== Ban Settings =============================================🟢 

"Manage Ban List"
"Manage Soft Ban List"
"Ban Settings"

ban score objective = "ban"
score = 1 is banned

each time they are kicked they get point added to objective = "ban_count"

This ban system provides a robust admin interface to manage two kinds of bans:

Hard Bans – Fully restricts a player’s access. Optionally kicks and runs custom commands.

Soft Bans – Restricts in-game behavior by teleporting players and/or confining them to specific areas.

It includes management menus for adding/removing players, customizing behavior, and saving persistent configurations.


----------------------------Hard Ban Menu-----------------------------
Allows adding or removing players from the hard ban list.

Players are pulled from knownPlayers, auto-populated from online users.

Owners cannot be banned.

Prevents duplicate entries or simultaneous add/remove actions.

Dropdowns	Purpose
Currently banned (read-only)	View list of banned users
Select player to ban	Add a player to the ban list
Select player to unban	Remove a player from the ban list

On Ban:

The banList is updated

checkBannedPlayers() is called immediately

Ban logs are saved

Player can be kicked or a command executed (configurable)

On Unban:

Player’s score is cleared: /scoreboard players reset "<name>" ban

------------------Soft Ban Menu-----------------------------------
Same logic as hard bans, but applies a less-restrictive ban:

Player is not kicked

Instead, they may be teleported or constrained to an area

Great for “timeout” zones, jails, or movement control

Dropdowns	Purpose
Currently soft-banned (read-only)	Shows current soft-banned users
Select player to soft-ban	Adds a new soft-banned player
Select player to un-soft-ban	Removes an existing one

Safeguards:

Owners cannot be soft-banned

Only one action is permitted per submission

-----------------Ban Settings----------------------------
Configure how the system responds to bans and soft-bans.

Field	Description
Kick on Ban	Whether banned players are kicked when they join
Enable Soft-Ban Teleport	Enables teleporting soft-banned players on join
Soft-Ban Teleport Coords (x,y,z)	Where to send soft-banned players
Soft-Ban Area Ranges	Define a 3D bounding box where soft-banned players are confined
Command to run on Ban	Executed when player is hard-banned
Command to run on Soft-Ban	Executed when soft-ban is applied

Validation & Repair:

Legacy numeric values for area bounds are auto-upgraded to {min, max}

Invalid input is gracefully rejected with user feedback

Coordinates must be x,y,z and ranges must be x..x,y..y,z..z

🟢 ======================================== AFK Settings =============================================🟢 

✅ Core Features
AFK Detection using:

Movement

Button input

Timeout Logic to determine inactivity (minutes)

Kick Timer after prolonged AFK (optional)

Command Execution when AFK

Scoreboard + Location Filtering

Exemption System using player tags


AFK System Enabled	Master toggle for system operation
Kick Enabled	If true, kicks player after kickAfterMinutes of inactivity
Kick After (minutes)	How long before a player is kicked for AFK
Timeout (minutes)	Time before a player is marked as AFK
Player AFK Message	Message sent when a player is marked AFK
Required Tags	Tag filters. Use !tag to exempt players with that tag
Filter Score Objective	Scoreboard filter for who can be affected
Filter Score Range	Valid score range (e.g. 1..10)
Set Score Objective	Scoreboard objective to modify when AFK
Set Score Range	Range to set when AFK
Set Score Mode	Whether to add or remove score when AFK
Enable Location Filter	If enabled, players outside a coordinate range are exempt
Location Ranges	Format: x..x,y..y,z..z (AFK only inside this box)
Commands to run on AFK	Commands to run for the player when they go AFK (comma-separated)


AFK check interval: every 60 seconds (1200 ticks)

Activity is updated by:

Movement (checked every 30 seconds)

Button input

Exemptions:

Based on !tag or missing tag logic

Kick logic:

If enabled and idle time > kickAfterMinutes, the player is kicked

Logs are created with [Afk-Kick]


The system only monitors players in real-time; there is no history or persistent AFK marker.

All filters (tags, score, location) must be passed for a player to be eligible for AFK detection.

Score is only adjusted (via applyDeltaSafely) if a valid objective and range are configured.

🟢 ======================================== Score Display Settings =============================================🟢 

This system allows admins to control how scoreboard objectives are displayed in the HUD using list, sidebar, and below-name slots. Each display type supports:

Multiple objectives with rotating display

Per-display delay timers

Format-color support (§a, §c, etc.)

Settings are editable via the in-game UI (showScoreDisplaySettingsMenu) and saved persistently in adminConfig.

🧾 Available Display Slots
Slot	Description
list	Shows a stat list in the pause menu (tab screen)
sidebar	Displays scoreboard on the right side of the screen (HUD sidebar)
belowname	Shows values under player name tags

Each slot can rotate between multiple objectives, updating at a configurable interval.

🛠 UI Settings (showScoreDisplaySettingsMenu)
Field	Description
List Display Enabled	Master toggle for list slot
Objectives for List	Comma-separated list of objectives (can include format codes like §aKills)
List Delay	Time (in seconds) between each objective rotation
Sidebar Display Enabled	Toggle for sidebar scoreboard
Objectives for Sidebar	List of sidebar objectives (with optional format codes)
Sidebar Delay	Sidebar rotation speed (in seconds)
Below-Name Display Enabled	Toggle to show score beneath players' name tags
Objectives for Below-Name	List of below-name objectives to rotate
Below-Name Delay	Rotation speed for below-name display (seconds)


Each enabled slot cycles through its configured objectives at the defined interval.

For each objective, a *_display clone objective is created and updated using:

scoreboard players operation @s <display_obj> = @s <source_obj>
The display slot is then updated to use that _display version.

Example:

Kills → objective name: "kills"
Display version created: "kills_display"
Shown in sidebar as: §aKills (if prefixed with §a)


Format Code Support

§aKills, §cDeaths, §eCoins
The formatted version will be used as the display name

The raw objective name will be extracted and used to copy scores into a new _display objective


A loop runs every 20 ticks (1 second)

Delays are managed with counters for each display type

Display is skipped if the corresponding toggle is disabled or the list is empty


🟢 ======================================== Owner Settings =============================================🟢

only visible to "OWNERS"

the first player to ever open the menu agrees to be owner and then they can manage a list of other "owners"

also you can manage a list of "admin" who can use menu

-----------Owner Section-------------
Field	Purpose
Current Owners	Read-only display of players with full permissions
Add Owner	Dropdown of known players not already owners
Remove Owner	Dropdown of current owners to remove
Enter Custom Owner Name	Allows you to manually enter a player name not in the known list

----------Admin Section-----------
Field	Purpose
Current Admins	Read-only display of players with admin permissions
Add Admin	Dropdown of known players not yet admins or owners
Remove Admin	Dropdown of current non-owner admins to remove
Enter Custom Admin Name	Manually specify a player name for admin access

-------Behavior & Rules--------------
Owners have full access to all admin tools, including owner-only menus like this one.

Admins have partial access (such as menus and scoreboard features) but not critical areas like bans or AFK/kick configuration.

Names added via the custom text field are accepted even if the player is not online or in the knownPlayers list.

Owners cannot be removed from the admin list in this menu—they are managed only under the owner section.

knownPlayers is auto-populated from online players, so the menu evolves as players join.



🟢 ======================================== ArcticSharkGames =============================================🟢

the kill death counter idea is something ive been working on since version 1.18 with just command blocks
it became a very popular video and idea and it was never very accurate with commands which lead me to make the first version of the add on
now more then 3 command versions and 3 add on versions later i never could have imagined where it would take us.

i hope you find some of the many features helpful. 

please subscribe to ArcticSharkGames on Youtube
https://www.youtube.com/@ArcticSharkGames

 and join the Shark Commanders Discord!!!

https://discord.com/invite/x4kKDnsqxB

feel free to use and edit this as you feel but please leave credit to ArcticSharkGames inside the files. 

Happy Commanding and Happy Scripting!

- ArcticSharkGames June 6th 2025
