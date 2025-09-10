# Complete User Flow Decision Trees

## Overview
This document maps all decision points and branches across every user flow, providing complete navigation logic for wireframe and development implementation.

## 1. Project Initiation Flow Decision Tree

```mermaid
flowchart TD
    A[User: "I need to cast a new show"] --> B[AI: Ask for project name]
    B --> C{User provides name?}
    C -->|Yes| D[AI: Ask project type]
    C -->|No/Unclear| E[AI: Clarify with examples]
    E --> D
    
    D --> F{Project type selected?}
    F -->|OTT Series| G[Enable episodic features]
    F -->|Feature Film| H[Enable lead role focus]
    F -->|Commercial| I[Enable quick turnaround]
    F -->|Multiple/Other| J[Full feature access]
    
    G --> K[Production house inquiry]
    H --> K
    I --> K
    J --> K
    
    K --> L{Production house known?}
    L -->|Yes| M[Link to existing profile]
    L -->|New| N[Create new profile]
    L -->|Skip| O[Continue without]
    
    M --> P[Timeline discussion]
    N --> P
    O --> P
    
    P --> Q{Timeline provided?}
    Q -->|Specific dates| R[Calculate urgency level]
    Q -->|Approximate| S[Request clarification]
    Q -->|Flexible| T[Use standard timeline]
    
    R --> U[Role definition phase]
    S --> U
    T --> U
    
    U --> V{How to define roles?}
    V -->|Voice description| W[Natural language parsing]
    V -->|Upload script| X[AI script analysis]
    V -->|Use template| Y[Template selection]
    V -->|Import similar| Z[Previous project import]
    
    W --> AA[AI role processing]
    X --> BB[Character extraction]
    Y --> CC[Template application]
    Z --> DD[Import adaptation]
    
    AA --> EE[Role confirmation]
    BB --> EE
    CC --> EE
    DD --> EE
    
    EE --> FF{Roles approved?}
    FF -->|Yes| GG[Team setup phase]
    FF -->|Modify| HH[Inline role editing]
    FF -->|Add more| II[Additional role creation]
    
    HH --> EE
    II --> EE
    GG --> JJ[Team assembly options]
    
    JJ --> KK{Team setup method?}
    KK -->|Quick add| LL[Predefined roles]
    KK -->|Manual entry| MM[Individual setup]
    KK -->|Import team| NN[Previous team import]
    KK -->|Skip for now| OO[Solo setup]
    
    LL --> PP[Permission assignment]
    MM --> PP
    NN --> PP
    OO --> QQ[Budget discussion]
    
    PP --> QQ
    QQ --> RR{Budget approach?}
    RR -->|Specific budget| SS[Budget allocation]
    RR -->|Range provided| TT[Flexible budgeting]
    RR -->|TBD/Skip| UU[Budget-free mode]
    
    SS --> VV[Constraint gathering]
    TT --> VV
    UU --> VV
    
    VV --> WW{Additional constraints?}
    WW -->|Location specific| XX[Location preferences]
    WW -->|Date conflicts| YY[Calendar integration]
    WW -->|Union requirements| ZZ[Compliance setup]
    WW -->|Language prefs| AAA[Language configuration]
    WW -->|None/Done| BBB[AI learning phase]
    
    XX --> BBB
    YY --> BBB
    ZZ --> BBB
    AAA --> BBB
    
    BBB --> CCC{Similar projects exist?}
    CCC -->|Yes| DDD[Reference options]
    CCC -->|No| EEE[Clean slate setup]
    
    DDD --> FFF[Project summary]
    EEE --> FFF
    
    FFF --> GGG{User approves setup?}
    GGG -->|Yes| HHH[Project activation]
    GGG -->|Modify| III[Back to relevant section]
    GGG -->|Start over| A
    
    HHH --> JJJ[Next action options]
    III --> FFF
    
    JJJ --> KKK{What's next?}
    KKK -->|Find talent| LLL[→ Talent Discovery Flow]
    KKK -->|Set up auditions| MMM[→ Audition Management Flow]
    KKK -->|Review setup| NNN[Project dashboard]
    KKK -->|Invite team| OOO[Team onboarding]
```

## 2. Talent Discovery Flow Decision Tree

```mermaid
flowchart TD
    A[User: "Find me a male lead, 25-35 years"] --> B[AI: Parse requirements]
    B --> C{Search input type?}
    C -->|Natural language| D[NLP processing]
    C -->|Image upload| E[Visual similarity search]
    C -->|Voice description| F[Speech-to-text + NLP]
    C -->|Reference actor| G[Style-based search]
    
    D --> H[Generate search parameters]
    E --> I[Visual feature extraction]
    F --> H
    G --> J[Actor style analysis]
    
    H --> K[Database search]
    I --> L[Visual matching]
    J --> M[Style similarity search]
    
    K --> N[Initial results (5-7 actors)]
    L --> N
    M --> N
    
    N --> O{Results satisfactory?}
    O -->|Good matches| P[Display results]
    O -->|Too many| Q[Auto-filter top matches]
    O -->|Too few| R[Broaden search criteria]
    O -->|No results| S[Suggest alternatives]
    
    Q --> P
    R --> T[Expanded results]
    S --> U[Alternative suggestions]
    T --> P
    U --> P
    
    P --> V{User interaction type?}
    V -->|Browse casually| W[Swipe interface]
    V -->|Detailed review| X[Profile deep dive]
    V -->|Quick decision| Y[Rapid shortlist]
    V -->|Comparison mode| Z[Multi-select compare]
    
    W --> AA{Swipe direction?}
    AA -->|Right (like)| BB[Add to shortlist]
    AA -->|Left (pass)| CC[Mark as not suitable]
    AA -->|Up (maybe)| DD[Add to consideration]
    
    BB --> EE[Continue browsing?]
    CC --> EE
    DD --> EE
    
    EE -->|Yes| V
    EE -->|No| FF[Shortlist review]
    
    X --> GG{Profile actions?}
    GG -->|View more work| HH[Portfolio expansion]
    GG -->|Check availability| II[Calendar integration]
    GG -->|Similar actors| JJ[Related suggestions]
    GG -->|Add to shortlist| BB
    GG -->|Back to results| V
    
    HH --> GG
    II --> GG
    JJ --> KK[New similar results]
    KK --> V
    
    Y --> LL{Quick shortlist size?}
    LL -->|Under 5| MM[Continue adding]
    LL -->|5-10| NN[Suggest finalization]
    LL -->|Over 10| OO[Suggest narrowing]
    
    MM --> V
    NN --> FF
    OO --> PP[Filtering suggestions]
    PP --> V
    
    Z --> QQ[Comparison interface]
    QQ --> RR{Comparison type?}
    RR -->|Side by side| SS[Split view]
    RR -->|Attribute matrix| TT[Feature comparison]
    RR -->|Video comparison| UU[Media comparison]
    
    SS --> VV[Make selection?]
    TT --> VV
    UU --> VV
    
    VV -->|Select one| WW[Add to shortlist]
    VV -->|Select multiple| XX[Batch shortlist]
    VV -->|Need more info| GG
    VV -->|Back to browse| V
    
    WW --> FF
    XX --> FF
    
    FF --> YY{Shortlist actions?}
    YY -->|Review shortlist| ZZ[Shortlist management]
    YY -->|Schedule auditions| AAA[→ Audition Flow]
    YY -->|Share with team| BBB[Collaboration mode]
    YY -->|Refine search| CCC[Back to search]
    YY -->|Start new search| DDD[New role search]
    
    ZZ --> EEE{Shortlist management?}
    EEE -->|Reorder priority| FFF[Drag and drop]
    EEE -->|Remove actors| GGG[Batch removal]
    EEE -->|Add notes| HHH[Annotation mode]
    EEE -->|Export list| III[Export options]
    
    FFF --> YY
    GGG --> YY
    HHH --> YY
    III --> YY
    
    CCC --> A
    DDD --> JJJ[New search parameters]
    JJJ --> A
```

## 3. Audition Management Flow Decision Tree

```mermaid
flowchart TD
    A[User: "Schedule auditions for shortlisted actors"] --> B[AI: Analyze shortlist]
    B --> C{Shortlist status?}
    C -->|5+ actors ready| D[Bulk scheduling mode]
    C -->|2-4 actors| E[Standard scheduling]
    C -->|1 actor| F[Individual scheduling]
    C -->|Empty shortlist| G[Redirect to talent search]
    
    D --> H[Availability coordination]
    E --> H
    F --> I[Single actor availability]
    G --> J[→ Talent Discovery Flow]
    
    I --> K[Individual slot booking]
    H --> L{Availability analysis?}
    L -->|All available| M[Optimal scheduling]
    L -->|Partial availability| N[Conflict resolution]
    L -->|None available| O[Alternative dates]
    L -->|Mixed schedules| P[Complex coordination]
    
    M --> Q[Venue selection]
    N --> R{Conflict handling?}
    R -->|Reschedule| S[Date adjustment]
    R -->|Split sessions| T[Multiple dates]
    R -->|Virtual option| U[Online auditions]
    R -->|Prioritize actors| V[Actor ranking]
    
    S --> Q
    T --> Q
    U --> W[Virtual setup]
    V --> Q
    
    O --> X{Alternative approach?}
    X -->|Different dates| Y[Calendar expansion]
    X -->|Virtual auditions| W
    X -->|Self-tape requests| Z[Self-tape setup]
    X -->|Postpone| AA[Scheduling delay]
    
    Y --> H
    Z --> BB[Self-tape coordination]
    AA --> CC[Delayed scheduling]
    
    P --> DD[Complex scheduling algorithm]
    DD --> Q
    
    Q --> EE{Venue requirements?}
    EE -->|Studio needed| FF[Studio booking]
    EE -->|Office space| GG[Internal space]
    EE -->|Virtual only| W
    EE -->|Location flexible| HH[Venue options]
    
    FF --> II{Studio availability?}
    II -->|Available| JJ[Confirm booking]
    II -->|Partially available| KK[Adjust schedule]
    II -->|Not available| LL[Alternative venues]
    
    JJ --> MM[Team coordination]
    KK --> MM
    LL --> HH
    HH --> MM
    GG --> MM
    
    W --> NN[Virtual platform setup]
    NN --> MM
    
    MM --> OO{Team availability?}
    OO -->|All available| PP[Full team session]
    OO -->|Partial team| QQ[Essential members only]
    OO -->|No availability| RR[Solo auditions]
    OO -->|Staggered| SS[Multiple sessions]
    
    PP --> TT[Schedule confirmation]
    QQ --> TT
    RR --> TT
    SS --> UU[Multi-session planning]
    UU --> TT
    
    TT --> VV{Confirmation method?}
    VV -->|Auto-confirm| WW[Automatic notifications]
    VV -->|Manual review| XX[Schedule review]
    VV -->|Batch confirm| YY[Bulk operations]
    
    WW --> ZZ[Send notifications]
    XX --> AAA{Review outcome?}
    AAA -->|Approve| WW
    AAA -->|Modify| BBB[Schedule adjustment]
    AAA -->|Cancel| CCC[Cancellation flow]
    
    BBB --> TT
    CCC --> DDD[Cancellation notifications]
    YY --> ZZ
    
    ZZ --> EEE[Pre-audition prep]
    EEE --> FFF{Preparation tasks?}
    FFF -->|Script distribution| GGG[Material sending]
    FFF -->|Venue confirmation| HHH[Location details]
    FFF -->|Tech setup| III[Equipment check]
    FFF -->|Team briefing| JJJ[Internal coordination]
    FFF -->|All complete| KKK[Audition day ready]
    
    GGG --> FFF
    HHH --> FFF
    III --> FFF
    JJJ --> FFF
    
    KKK --> LLL[Audition day management]
    LLL --> MMM{Day-of coordination?}
    MMM -->|Running smoothly| NNN[Normal operations]
    MMM -->|Delays| OOO[Schedule adjustments]
    MMM -->|No-shows| PPP[Replacement coordination]
    MMM -->|Technical issues| QQQ[Problem resolution]
    
    NNN --> RRR[Feedback collection]
    OOO --> SSS[Dynamic rescheduling]
    PPP --> TTT[Backup actor calling]
    QQQ --> UUU[Issue troubleshooting]
    
    SSS --> RRR
    TTT --> RRR
    UUU --> RRR
    
    RRR --> VVV{Feedback method?}
    VVV -->|Real-time notes| WWW[Live documentation]
    VVV -->|Post-session| XXX[Delayed feedback]
    VVV -->|Voice notes| YYY[Audio capture]
    VVV -->|Team discussion| ZZZ[Group feedback]
    
    WWW --> AAAA[Feedback compilation]
    XXX --> AAAA
    YYY --> AAAA
    ZZZ --> AAAA
    
    AAAA --> BBBB{Next actions?}
    BBBB -->|Decision ready| CCCC[→ Decision Making Flow]
    BBBB -->|Need callbacks| DDDD[Callback scheduling]
    BBBB -->|More auditions| EEEE[Additional sessions]
    BBBB -->|Review complete| FFFF[Process completion]
    
    DDDD --> A
    EEEE --> A
```

## 4. Decision Making Flow Decision Tree

```mermaid
flowchart TD
    A[User: "Let's finalize the cast"] --> B[AI: Gather decision context]
    B --> C{Decision scope?}
    C -->|Single role| D[Role-specific decision]
    C -->|Multiple roles| E[Batch decision process]
    C -->|Full cast| F[Complete casting decision]
    C -->|Emergency decision| G[Crisis decision mode]
    
    D --> H[Single role analysis]
    E --> I[Multi-role coordination]
    F --> J[Full cast review]
    G --> K[Emergency protocols]
    
    H --> L{Available options?}
    L -->|Clear favorite| M[Obvious choice path]
    L -->|2-3 contenders| N[Comparison needed]
    L -->|Many options| O[Narrowing required]
    L -->|No good options| P[Search expansion needed]
    
    M --> Q[Stakeholder confirmation]
    N --> R[Detailed comparison]
    O --> S[Filtering process]
    P --> T[→ Talent Discovery Flow]
    
    I --> U{Role priorities?}
    U -->|Lead roles first| V[Priority-based sequence]
    U -->|Budget-driven| W[Cost-conscious ordering]
    U -->|Availability-driven| X[Schedule-based sequence]
    U -->|Dependency-based| Y[Relationship-aware ordering]
    
    V --> Z[Sequential role decisions]
    W --> Z
    X --> Z
    Y --> Z
    
    J --> AA{Full cast status?}
    AA -->|Most roles filled| BB[Complete remaining roles]
    AA -->|Mixed progress| CC[Prioritize pending decisions]
    AA -->|Starting fresh| DD[Full cast planning]
    
    BB --> EE[Final role completion]
    CC --> FF[Strategic completion]
    DD --> GG[Comprehensive planning]
    
    K --> HH{Emergency type?}
    HH -->|Actor dropout| II[Replacement urgency]
    HH -->|Budget crisis| JJ[Cost-driven decisions]
    HH -->|Timeline pressure| KK[Speed-optimized process]
    HH -->|Stakeholder conflict| LL[Dispute resolution]
    
    II --> MM[Rapid replacement]
    JJ --> NN[Budget optimization]
    KK --> OO[Fast-track approval]
    LL --> PP[Conflict mediation]
    
    R --> QQ{Comparison criteria?}
    QQ -->|Performance| RR[Audition comparison]
    QQ -->|Budget impact| SS[Financial analysis]
    QQ -->|Availability| TT[Schedule comparison]
    QQ -->|Team preference| UU[Stakeholder polling]
    QQ -->|Overall fit| VV[Holistic evaluation]
    
    RR --> WW[Performance analysis]
    SS --> XX[Budget breakdown]
    TT --> YY[Calendar analysis]
    UU --> ZZ[Preference gathering]
    VV --> AAA[Complete evaluation]
    
    WW --> BBB[Present findings]
    XX --> BBB
    YY --> BBB
    ZZ --> BBB
    AAA --> BBB
    
    BBB --> CCC{Decision readiness?}
    CCC -->|Clear consensus| DDD[Proceed with selection]
    CCC -->|Need discussion| EEE[Team consultation]
    CCC -->|Split opinion| FFF[Conflict resolution]
    CCC -->|Need more info| GGG[Additional research]
    
    DDD --> HHH[Selection confirmation]
    EEE --> III{Discussion outcome?}
    III -->|Agreement reached| DDD
    III -->|Still divided| FFF
    III -->|Need external input| JJJ[External consultation]
    
    FFF --> KKK{Conflict resolution?}
    KKK -->|Stakeholder hierarchy| LLL[Authority decision]
    KKK -->|Compromise solution| MMM[Middle ground]
    KKK -->|Additional auditions| NNN[More evaluation]
    KKK -->|External mediation| OOO[Third-party input]
    
    LLL --> HHH
    MMM --> HHH
    NNN --> PPP[Extended evaluation]
    OOO --> QQQ[Mediated decision]
    
    PPP --> CCC
    QQQ --> CCC
    JJJ --> CCC
    GGG --> RRR[Information gathering]
    RRR --> CCC
    
    HHH --> SSS{Selection type?}
    SSS -->|First choice| TTT[Preferred candidate]
    SSS -->|Conditional| UUU[Negotiation required]
    SSS -->|Package deal| VVV[Multi-actor selection]
    SSS -->|Backup plan| WWW[Primary + alternate]
    
    TTT --> XXX[Direct offer process]
    UUU --> YYY[Negotiation phase]
    VVV --> ZZZ[Package coordination]
    WWW --> AAAA[Tiered approach]
    
    YYY --> BBBB{Negotiation outcome?}
    BBBB -->|Accepted| CCCC[Successful negotiation]
    BBBB -->|Declined| DDDD[Move to backup]
    BBBB -->|Counter-offer| EEEE[Negotiation continuation]
    BBBB -->|Stalled| FFFF[Mediation required]
    
    CCCC --> GGGG[Contract preparation]
    DDDD --> HHHH[Backup activation]
    EEEE --> YYY
    FFFF --> IIII[Professional mediation]
    
    XXX --> GGGG
    ZZZ --> JJJJ[Package processing]
    AAAA --> KKKK[Tiered execution]
    
    GGGG --> LLLL{Contract status?}
    LLLL -->|Signed| MMMM[Casting confirmed]
    LLLL -->|Under review| NNNN[Legal review]
    LLLL -->|Issues identified| OOOO[Contract revision]
    
    MMMM --> PPPP[Success completion]
    NNNN --> QQQQ[Review process]
    OOOO --> RRRR[Revision cycle]
    
    QQQQ --> LLLL
    RRRR --> LLLL
    HHHH --> SSS
    IIII --> BBBB
    JJJJ --> SSSS[Multi-contract management]
    KKKK --> TTTT[Sequential execution]
    
    SSSS --> UUUU[Package completion]
    TTTT --> VVVV[Priority execution]
```

## 5. Emergency Recovery Flow Decision Tree

```mermaid
flowchart TD
    A[Emergency Trigger Detected] --> B{Emergency type?}
    B -->|User lost/confused| C[Navigation assistance]
    B -->|System failure| D[Technical recovery]
    B -->|Casting crisis| E[Crisis management]
    B -->|Deadline panic| F[Urgency handling]
    B -->|Data loss| G[Data recovery]
    
    C --> H{Lost user indicators?}
    H -->|Circular navigation| I[Break loop assistance]
    H -->|Extended idle| J[Proactive help offer]
    H -->|Multiple backs| K[Context restoration]
    H -->|Frustrated tone| L[Calm intervention]
    H -->|Help command| M[Direct assistance]
    
    I --> N[Navigation reset]
    J --> O[Activity resumption]
    K --> P[Context rebuilding]
    L --> Q[Stress reduction mode]
    M --> R[Help menu display]
    
    N --> S[User guidance]
    O --> S
    P --> S
    Q --> S
    R --> S
    
    D --> T{System issue type?}
    T -->|Network failure| U[Offline mode activation]
    T -->|App crash| V[State recovery]
    T -->|Sync failure| W[Data synchronization]
    T -->|Performance| X[Performance recovery]
    
    U --> Y[Offline capability check]
    V --> Z[Previous state restoration]
    W --> AA[Manual sync attempt]
    X --> BB[Resource optimization]
    
    Y --> CC{Offline actions possible?}
    CC -->|Yes| DD[Offline mode interface]
    CC -->|Limited| EE[Reduced functionality]
    CC -->|No| FF[Error explanation]
    
    DD --> GG[Queue actions for sync]
    EE --> GG
    FF --> HH[Manual recovery options]
    
    E --> II{Crisis severity?}
    II -->|Critical (actor dropout)| JJ[Emergency replacement]
    II -->|Urgent (schedule conflict)| KK[Rapid rescheduling]
    II -->|Important (budget issue)| LL[Financial resolution]
    II -->|Moderate (team conflict)| MM[Mediation assistance]
    
    JJ --> NN[Backup actor activation]
    KK --> OO[Schedule optimization]
    LL --> PP[Budget adjustment]
    MM --> QQ[Conflict resolution]
    
    NN --> RR{Backup availability?}
    RR -->|Available| SS[Rapid booking]
    RR -->|Partial| TT[Compromise solution]
    RR -->|None| UU[Emergency search]
    
    SS --> VV[Crisis resolution]
    TT --> WW[Adjusted solution]
    UU --> XX[Expanded options]
    
    F --> YY{Deadline pressure level?}
    YY -->|Extreme (<2 hours)| ZZ[Panic mode activation]
    YY -->|High (<24 hours)| AAA[Expedited process]
    YY -->|Moderate (<week)| BBB[Accelerated workflow]
    
    ZZ --> CCC[Auto-decision mode]
    AAA --> DDD[Fast-track approval]
    BBB --> EEE[Priority processing]
    
    CCC --> FFF{Auto-decision options?}
    FFF -->|Pre-approved choices| GGG[Instant selection]
    FFF -->|Best AI recommendations| HHH[Algorithm selection]
    FFF -->|Previous patterns| III[Pattern-based choice]
    
    GGG --> JJJ[Automated execution]
    HHH --> JJJ
    III --> JJJ
    
    G --> KKK{Data loss extent?}
    KKK -->|Partial loss| LLL[Incremental recovery]
    KKK -->|Complete loss| MMM[Full restoration]
    KKK -->|Corruption| NNN[Data repair]
    
    LLL --> OOO[Backup integration]
    MMM --> PPP[Complete rebuild]
    NNN --> QQQ[Corruption fixing]
    
    S --> RRR{Resolution successful?}
    RRR -->|User satisfied| SSS[Normal operation]
    RRR -->|Partial success| TTT[Additional assistance]
    RRR -->|Still confused| UUU[Escalation required]
    
    SSS --> VVV[Recovery complete]
    TTT --> WWW[Extended support]
    UUU --> XXX[Human intervention]
    
    VV --> YYY{Crisis fully resolved?}
    WW --> YYY
    XX --> YYY
    YYY -->|Yes| VVV
    YYY -->|Partially| ZZZ[Continued monitoring]
    YYY -->|No| AAAA[Escalation protocols]
    
    JJJ --> BBBB{Execution successful?}
    BBBB -->|Success| VVV
    BBBB -->|Partial| CCCC[Manual completion]
    BBBB -->|Failed| DDDD[Fallback procedures]
    
    OOO --> EEEE[Validation check]
    PPP --> EEEE
    QQQ --> EEEE
    
    EEEE --> FFFF{Data integrity confirmed?}
    FFFF -->|Yes| VVV
    FFFF -->|Issues remain| GGGG[Additional recovery]
    FFFF -->|Unrecoverable| HHHH[Loss mitigation]
    
    ZZZ --> IIII[Monitoring continuation]
    AAAA --> JJJJ[Emergency escalation]
    CCCC --> KKKK[Manual intervention]
    DDDD --> LLLL[System fallback]
    GGGG --> MMMM[Advanced recovery]
    HHHH --> NNNN[Data recreation]
```

## Conclusion

**DECISION TREES COMPLETE ✅**

All user flows now have comprehensive decision trees mapping:

1. **Complete Branch Coverage:** Every possible user path and decision point mapped
2. **Error Handling:** All error states and recovery paths included  
3. **Context Switching:** Flow transitions and cross-references documented
4. **Emergency Scenarios:** Crisis situations and rapid resolution paths
5. **Implementation Logic:** Clear decision criteria for development
6. **User Experience:** All interaction patterns and feedback loops

**PHASE 1 COMPLETE:** User flows are comprehensively documented and ready to feed into Phase 2 (Inspiration Analysis). All decision trees provide complete logic for wireframe creation and development implementation.