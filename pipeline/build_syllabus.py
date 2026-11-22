"""Build app/public/content/syllabus.json: the TNPSC Group I, II & II-A Prelims syllabus, topic by topic,
with the SCERT chapters to study for each (mapping transcribed from the "where to study" pages in Syllabus/,
see pipeline/syllabus/where_to_study_notes.md). Each source is (book id, regex on chapter title) and is resolved
to real chapter ids here, so a typo fails loudly instead of producing a dead link.

Run: python pipeline/build_syllabus.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "app" / "public" / "content"

# (book id, chapter-title regex). Book ids: c6-sci-ss, c6-t1/t2/t3-maths, c7-sci-ss, c7-maths, c8-sci, c8-ss, c8-maths,
# c9-sci, c9-ss, c9-maths, c10-sci, c10-ss, c10-maths, c11-his/geo/pol/eco/phy1/phy2/chem1/chem2/bot/zoo,
# c12-his/geo/pol/eco/phy1/phy2/chem1/chem2/bot/zoo
S = lambda book, rx: (book, rx)

PRELIMS = [
    {"code": "I", "title": "General Science", "sections": [
        {"title": "Physics", "topics": [
            ("Scientific knowledge and scientific temper - power of reasoning - rote learning vs conceptual learning - science as a tool to understand the past, present and future",
             [S("c11-phy1", "Nature of Physical World"), S("c11-chem1", "Basic Concepts"), S("c12-chem2", "Everyday Life"),
              S("c11-zoo", "Medical Instruments|Economic Zoology"), S("c12-phy2", "Recent Developments"),
              S("c12-bot", "Economically Useful"), S("c12-zoo", "Applications of Biotechnology")], []),
            ("Nature of universe - general scientific laws",
             [S("c7-sci-ss", "Universe and Space"), S("c8-sci", "Universe"), S("c9-sci", "^Universe"), S("c11-phy2", "Gravitation")], []),
            ("Mechanics - properties of matter, force, motion and energy - everyday application of the basic principles of mechanics",
             [S("c6-sci-ss", "Force and Motion"), S("c7-sci-ss", "Force and Motion"), S("c8-sci", "Force and Pressure"),
              S("c9-sci", "^Motion|Fluids"), S("c10-sci", "Laws of Motion"), S("c11-phy1", "Kinematics|Laws of Motion|Work, Energy|Rigid Bodies"),
              S("c11-phy2", "Properties of Matter")], []),
            ("Electricity and magnetism",
             [S("c6-sci-ss", "^Electricity|Magnetism"), S("c7-sci-ss", "Electricity"), S("c8-sci", "Electricity|Magnetism"),
              S("c9-sci", "Electric|Magnetism"), S("c10-sci", "Electricity"), S("c12-phy1", "Electrostatics|Current Electricity|Magnetism|Induction")], []),
            ("Light, sound, heat",
             [S("c6-sci-ss", "^Heat"), S("c7-sci-ss", "Heat|Light"), S("c8-sci", "Light|Heat|Sound"), S("c9-sci", "Light|Heat|Sound"),
              S("c10-sci", "Optics|Thermal|Acoustics"), S("c11-phy2", "Heat|Kinetic|Oscillations|Waves"), S("c12-phy1", "Electromagnetic Waves"),
              S("c12-phy2", "Ray Optics")], []),
            ("Nuclear physics",
             [S("c7-sci-ss", "Atomic Structure"), S("c8-sci", "Atomic Structure"), S("c9-sci", "Atomic Structure"),
              S("c10-sci", "Nuclear Physics"), S("c12-phy2", "Atomic and Nuclear")], []),
            ("Laser, electronics and communications",
             [S("c12-phy2", "Electronics|Dual Nature")], []),
        ]},
        {"title": "Chemistry", "topics": [
            ("Elements and compounds, acids, bases, salts, petroleum products, fertilizers, pesticides",
             [S("c6-sci-ss", "Matter Around|Changes Around|Chemistry in Everyday"), S("c7-sci-ss", "Matter Around|Atomic Structure|Changes Around|Polymer|Chemistry in Daily"),
              S("c8-sci", "Matter Around|Changes Around|Atomic|Acids|Chemistry in Everyday|Air|Water"),
              S("c9-sci", "Matter|Atomic|Periodic|Bonding|Acids|Carbon|Applied Chemistry"),
              S("c10-sci", "Atoms and Molecules|Periodic|Solutions|Chemical Reactions|Carbon"),
              S("c11-chem1", "Periodic|Hydrogen|Alkali"), S("c11-chem2", "Organic|Hydrocarbons|Environmental"),
              S("c12-chem1", "Metallurgy|p-Block|Transition"), S("c12-chem2", "Electrochemistry|Organic Nitrogen|Everyday Life")], []),
            ("Current affairs related to chemistry",
             [], ["New discoveries, medicinal chemistry, vaccines", "ISRO research, ethanol-blended petrol", "Nobel prizes, mining, pollution and AQI",
                  "Food adulterants, metallurgical industries, Pollution Control Board", "Follow the News section"]),
        ]},
        {"title": "Botany", "topics": [
            ("Main concepts of life science",
             [S("c11-bot", "Living World"), S("c11-zoo", "The Living World")], []),
            ("Classification of living organisms",
             [S("c6-sci-ss", "World of Plants"), S("c7-sci-ss", "Basis of Classification"), S("c8-sci", "Microorganisms|Plant Kingdom"),
              S("c9-sci", "Plant Physiology"), S("c11-bot", "Plant Kingdom|Taxonomy|Morphology")], []),
            ("Genetics", [S("c10-sci", "Genetics|Evolution"), S("c12-bot", "Genetics|Inheritance")], []),
            ("Physiology",
             [S("c6-sci-ss", "The Cell"), S("c7-sci-ss", "Reproduction and Modification|Cell Biology"),
              S("c10-sci", "Plant Anatomy|Transportation|Nervous|Reproduction"), S("c11-bot", "Cell|Transport|Photosynthesis|Respiration|Growth")], []),
            ("Nutrition, health and hygiene, human diseases", [S("c10-sci", "Hormones"), S("c11-bot", "Mineral Nutrition")], []),
            ("Environment and ecology",
             [S("c6-sci-ss", "Our Environment"), S("c9-sci", "Environmental Science|Economic Biology"),
              S("c10-sci", "Environmental Management|Breeding"), S("c12-bot", "Ecology|Ecosystem|Environmental Issues")], []),
            ("Latest inventions in science and technology", [], ["Science Reporter (CSIR), Down to Earth (CSE)", "Follow the News section"]),
        ]},
        {"title": "Zoology", "topics": [
            ("Main concepts of life science", [S("c11-zoo", "The Living World")], []),
            ("Classification of living organisms",
             [S("c7-sci-ss", "Basis of Classification"), S("c8-sci", "Microorganisms"), S("c9-sci", "Animal Kingdom|Organisation of Tissues"),
              S("c10-sci", "Structural Organisation"), S("c11-zoo", "Kingdom Animalia|Tissue Level")], []),
            ("Evolution, genetics", [S("c12-zoo", "Evolution|Inheritance|Molecular Genetics")], []),
            ("Physiology",
             [S("c6-sci-ss", "The Cell|Organ systems"), S("c7-sci-ss", "Cell Biology"), S("c8-sci", "Organisation of Life|Movements"),
              S("c9-sci", "Organ Systems"), S("c10-sci", "Structural Organisation|Transportation|Nervous|Reproduction"),
              S("c11-zoo", "Digestion|Respiration|Body Fluids|Excretion|Locomotion|Neural|Chemical Coordination"),
              S("c12-zoo", "Reproduction in Organisms|Human Reproduction")], []),
            ("Nutrition, health and hygiene, human diseases",
             [S("c6-sci-ss", "Health and Hygiene"), S("c7-sci-ss", "Health and Hygiene"), S("c8-sci", "Adolescence"),
              S("c9-sci", "Nutrition and Health"), S("c10-sci", "Health and Diseases|Hormones"),
              S("c12-zoo", "Reproductive Health|Human Health|Immunology")], []),
            ("Environment and ecology; latest inventions in science and technology",
             [S("c6-sci-ss", "Our Environment"), S("c9-sci", "Environmental Science|Economic Biology"),
              S("c10-sci", "Environmental Management|Breeding"), S("c12-zoo", "Organisms and Populations|Biodiversity|Environmental Issues")], []),
        ]},
    ]},
    {"code": "II", "title": "Geography of India", "sections": [
        {"title": None, "topics": [
            ("Location - physical features",
             [S("c10-ss", "Location, Relief|Physical Geography of Tamil"), S("c7-sci-ss", "Tourism"), S("c12-geo", "Cultural and Political")], []),
            ("Monsoon, rainfall, weather and climate", [S("c10-ss", "Climate and Natural|Physical Geography of Tamil")], []),
            ("Water resources - rivers in India", [S("c10-ss", "Location, Relief|Physical Geography of Tamil"), S("c12-geo", "Sustainable")], []),
            ("Soil, minerals and natural resources - green energy - industry",
             [S("c6-sci-ss", "Resources"), S("c7-sci-ss", "Resources"), S("c8-ss", "Industries"),
              S("c10-ss", "Agriculture|Resources and Industries|Geography of Tamil"), S("c12-geo", "Resources|Economic Activities")], []),
            ("Forest and wildlife", [S("c7-sci-ss", "Tourism"), S("c10-ss", "Climate and Natural|Physical Geography of Tamil"), S("c11-geo", "Biosphere")], []),
            ("Agricultural pattern", [S("c10-ss", "Agriculture|Human Geography of Tamil"), S("c12-geo", "Economic Activities")], []),
            ("Transport", [S("c10-ss", "Population, Transport|Human Geography of Tamil")], []),
            ("Communication", [S("c9-ss", "Mapping Skills"), S("c10-ss", "Population, Transport|Human Geography of Tamil"), S("c12-geo", "Geoinformatics")], []),
            ("Social geography - population density and distribution",
             [S("c7-sci-ss", "Population and Settlement"), S("c8-ss", "Migration and Urbanisation"), S("c9-ss", "Man and Environment"),
              S("c10-ss", "Population, Transport|Human Geography of Tamil"), S("c12-geo", "Population Geography|Human Settlements")], []),
            ("Racial, linguistic groups and major tribes", [S("c7-sci-ss", "Population and Settlement"), S("c12-geo", "Cultural and Political")], []),
            ("Natural calamity - disaster management",
             [S("c6-sci-ss", "Disaster"), S("c7-sci-ss", "Natural Hazards"), S("c8-ss", "Hazards"), S("c9-ss", "Disaster Management"),
              S("c10-ss", "Human Geography of Tamil"), S("c11-geo", "Natural Disasters"), S("c12-geo", "Man-Made Disasters")], []),
            ("Basics of geography (must study)", [S("c6-sci-ss", "Asia and Europe|Globe"), S("c11-geo", "Solar System")], []),
        ]},
    ]},
    {"code": "III", "title": "History, Culture of India and Indian National Movement", "sections": [
        {"title": None, "topics": [
            ("Indus Valley Civilization", [S("c6-sci-ss", "Indus"), S("c9-ss", "Evolution of Humans"), S("c11-his", "From the Beginnings")], ["11th Ethics and Indian Culture, unit 2 (Tamil edition only)"]),
            ("Guptas", [S("c6-sci-ss", "Guptas"), S("c11-his", "Post-Mauryan|The Guptas")], ["12th Ethics and Indian Culture, unit 5 (Tamil edition only)"]),
            ("Delhi Sultans", [S("c7-sci-ss", "Delhi Sultanate"), S("c11-his", "Arabs and Turks")], ["12th Ethics and Indian Culture, unit 5 (Tamil edition only)"]),
            ("Mughals and Marathas", [S("c7-sci-ss", "Mughal|Marathas"), S("c11-his", "Mughal|Marathas")], ["12th Ethics and Indian Culture, unit 5 (Tamil edition only)"]),
            ("Age of Vijayanagaram and Bahmani kingdoms", [S("c7-sci-ss", "Vijayanagar"), S("c11-his", "Bahmani")], []),
            ("South Indian history; change and continuity in the socio-cultural history of India; characteristics of Indian culture, unity in diversity - race, language, custom; India as a secular state, social harmony",
             [S("c6-sci-ss", "Ancient Cities|South Indian Kingdoms|Understanding Diversity"), S("c7-sci-ss", "Kingdoms in South"),
              S("c8-ss", "Educational Development|Development of Industries"), S("c9-ss", "Early Tamil|Medieval India"),
              S("c11-his", "Cultural Development|Later Cholas|Bhakti")], ["12th Ethics and Indian Culture, unit 5 (Tamil edition only)"]),
        ]},
        {"title": "Indian National Movement", "topics": [
            ("National renaissance - early uprising against British rule - Indian National Congress - emergence of leaders: B.R. Ambedkar, Bhagat Singh, Bharathiar, V.O. Chidambaranar, Jawaharlal Nehru, Kamarajar, Mahatma Gandhi, Maulana Abul Kalam Azad, Thanthai Periyar, Rajaji, Subash Chandra Bose, Rabindranath Tagore and others",
             [S("c8-ss", "Advent of the Europeans"), S("c10-ss", "Anti-Colonial|Gandhian"), S("c11-pol", "Tamil Nadu Political Thought"),
              S("c11-his", "Coming of the Europeans|Early Resistance"), S("c12-his", "Rise of Nationalism|Extremism|World War I")],
             ["11th Ethics and Indian Culture, unit 10 (Tamil edition only)"]),
            ("Different modes of agitation: growth of satyagraha and militant movements",
             [S("c12-his", "Advent of Gandhi|Radicalism|Communalism in|Last Phase")], []),
            ("Communalism and partition", [S("c12-his", "Communalism|Last Phase|Reconstruction"), S("c11-his", "Effects of British")], []),
        ]},
    ]},
    {"code": "IV", "title": "Indian Polity", "sections": [
        {"title": None, "topics": [
            ("Introduction, political systems - federal, unitary, presidential, parliamentary, republic, monarchy; salient features",
             [S("c11-pol", "Forms of Government"), S("c12-pol", "Constitution of India"), S("c6-sci-ss", "Democracy"),
              S("c7-sci-ss", "Political Parties|Media and Democracy"), S("c9-ss", "Forms of Government|Election, Political"),
              S("c10-ss", "Indian Constitution")], []),
            ("Making and sources of the Indian Constitution", [S("c12-pol", "Constitution of India")], []),
            ("Constitutional development since 1773 to 1947", [S("c12-pol", "Constitution of India")], []),
            ("Preamble, Union and States, citizenship",
             [S("c11-pol", "Social Justice"), S("c12-pol", "Challenges of Nation"), S("c6-sci-ss", "Achieving Equality"),
              S("c7-sci-ss", "^Equality"), S("c8-ss", "Citizens and Citizenship|Secularism")], []),
            ("Fundamental Rights, DPSP, Fundamental Duties, amendments",
             [S("c12-pol", "Constitution of India|Legislature"), S("c8-ss", "Human Rights"), S("c9-ss", "Human Rights")], []),
            ("Union executive - President, Vice President, Prime Minister, Council of Ministers; Supreme Court",
             [S("c12-pol", "Executive|Judiciary"), S("c8-ss", "Judiciary"), S("c10-ss", "Central Government")], []),
            ("Parliament - A to Z", [S("c12-pol", "Legislature|Administrative Machinery")], []),
            ("State executive - Governor, Chief Minister, Council of Ministers, State Legislature; Union Territories, High Court, subordinate courts",
             [S("c12-pol", "Legislature|Executive"), S("c7-sci-ss", "State Government"), S("c8-ss", "State Government Works"), S("c10-ss", "State Government")], []),
            ("Grass root democracy, district administration, Centre-State relations, inter-state relations, Article 370",
             [S("c11-pol", "Local Governments"), S("c12-pol", "Constitution of India|Federalism"), S("c6-sci-ss", "Local Bodies"), S("c9-ss", "Local Self")], []),
            ("Emergency, constitutional bodies - UPSC, Election Commission, Finance Commission, National Commissions for SC, ST, NCBC, CAG, Attorney General and Advocate General",
             [S("c12-pol", "Administrative Machinery")], []),
            ("Statutory bodies - NHRC, NWC, NMC, NCPCR; CVC, CIC, CBI, Lokpal, Lok Ayukta, Lok Adalat, NALSA", [S("c8-ss", "Human Rights")], []),
            ("Miscellaneous - civil services, tribunals, official languages, political parties, election reforms, human rights, citizen charter, consumer forums, pressure groups",
             [S("c11-pol", "Public Opinion|Election and Representation"), S("c7-sci-ss", "Consumer Protection")], []),
        ]},
    ]},
    {"code": "V", "title": "Indian Economy", "sections": [
        {"title": None, "topics": [
            ("Nature of Indian economy", [S("c11-eco", "Micro-Economics|^Indian Economy$|Before and After|Development Experiences"), S("c12-eco", "Macro|Development and Planning")], []),
            ("Five year plan models - an assessment - Planning Commission and NITI Aayog", [S("c11-eco", "Before and After"), S("c12-eco", "Development and Planning")], []),
            ("Sources of revenue - Reserve Bank of India - monetary policy", [S("c11-eco", "Before and After|Rural Economy"), S("c12-eco", "National Income|Monetary|Banking")], []),
            ("Fiscal policy, Finance Commission - resource sharing between Union and States; taxation - Goods and Services Tax",
             [S("c11-eco", "Before and After|Development Experiences"), S("c12-eco", "Fiscal|Development and Planning")], []),
            ("Structure of Indian economy and employment generation - land reforms and agriculture - application of science and technology in agriculture - rural welfare oriented programmes",
             [S("c11-eco", "Before and After|Development Experiences|Rural Economy"), S("c12-eco", "Environmental Economics")], []),
            ("Industrial growth", [S("c11-eco", "Before and After")], []),
            ("Social problems - population, education, employment, health, poverty",
             [S("c11-eco", "Before and After|Development Experiences|Rural Economy"), S("c12-eco", "Theories of Employment")], []),
        ]},
        {"title": "Development Administration in Tamil Nadu", "topics": [
            ("Human development indicators in Tamil Nadu and a comparative assessment across the country", [], ["Tamil Nadu Human Development Report 2017", "Newspapers"]),
            ("Impact of social reform movements in the socio-economic development of Tamil Nadu",
             [S("c8-ss", "Status of Women"), S("c10-ss", "Reform Movements|Social Transformation"), S("c11-his", "Towards Modernity")], []),
            ("Political parties and welfare schemes for various sections of people", [S("c9-ss", "Election, Political"), S("c11-pol", "Political Developments in Tamil")], []),
            ("Rationale behind the reservation policy and access to the social resources", [S("c11-pol", "Social Justice"), S("c12-pol", "Constitution of India")], []),
            ("Economic trends in Tamil Nadu",
             [S("c9-ss", "Employment in India|Migration"), S("c10-ss", "Industrial Clusters"), S("c11-eco", "Tamil Nadu Economy")],
             ["Tamil Nadu Economic Survey", "Tamil Nadu Government Budget"]),
            ("Role and impact of social welfare schemes in the socio-economic development of Tamil Nadu", [], ["Tamil Nadu State Planning Commission reports"]),
            ("Social justice and social harmony as the cornerstones of socio-economic development", [S("c11-pol", "Social Justice"), S("c8-ss", "Secularism")], []),
            ("Education and health systems in Tamil Nadu", [S("c8-ss", "Educational Development")], ["Policy notes: School Education, Higher Education, Health"]),
            ("Geography of Tamil Nadu and its impact on economic growth", [S("c10-ss", "Geography of Tamil"), S("c9-ss", "Agriculture in Tamil")], []),
            ("Achievements of Tamil Nadu in various fields", [], ["Tamil Nadu Government department policy notes"]),
            ("e-Governance in Tamil Nadu", [], ["Policy note: Information Technology and Digital Services"]),
            ("Public awareness and general administration", [], ["Policy note: Public Department"]),
            ("Welfare oriented government schemes and their utility", [], ["Policy notes of all Tamil Nadu Government departments"]),
            ("Problems in public delivery systems", [], ["Policy note: Civil Supplies and Consumer Protection"]),
            ("Current socio-economic issues", [], ["Fifteenth Finance Commission report on Tamil Nadu finances", "Follow the News section"]),
        ]},
    ]},
    {"code": "VI", "title": "History, Culture, Heritage and Socio-Political Movements in Tamil Nadu", "sections": [
        {"title": None, "topics": [
            ("History of Tamil society",
             [S("c6-sci-ss", "Ancient Cities|Vedic Culture|Ancient Tamizha"), S("c9-ss", "Evolution of Humans|Early Tamil"),
              S("c11-his", "Chalcolithic|Evolution of Society")], []),
            ("Archaeological discoveries", [], ["Tamil Nadu State Department of Archaeology (tnarch.gov.in)", "Archaeology-related current affairs"]),
            ("Thirukkural", [], ["6th-12th Tamil textbooks (coming with Tamil support)"]),
            ("Role of Tamil Nadu in freedom struggle", [S("c10-ss", "Freedom Struggle in Tamil")], ["6th Tamil, Term 3 (coming with Tamil support)"]),
        ]},
    ]},
    {"code": "B", "title": "Aptitude and Mental Ability", "sections": [
        {"title": None, "topics": [
            ("HCF and LCM", [S("c6-t2-maths", "Numbers"), S("c8-maths", "Numbers"), S("c9-maths", "Real Number"), S("c10-maths", "Numbers and Sequences")], []),
            ("Percentage", [S("c7-maths", "Percentage"), S("c8-maths", "Life Mathematics")], []),
            ("Profit and loss", [S("c6-t2-maths", "Profit and Loss"), S("c7-maths", "Percentage"), S("c8-maths", "Life Mathematics")], []),
            ("Ratio and proportion", [S("c6-t1-maths", "Ratio"), S("c7-maths", "Proportion")], []),
            ("Simple and compound interest", [S("c7-maths", "Percentage"), S("c8-maths", "Life Mathematics")], []),
            ("Time and work", [S("c7-maths", "Proportion"), S("c8-maths", "Life Mathematics")], []),
            ("Probability", [S("c9-maths", "Probability"), S("c10-maths", "Probability")], []),
            ("Number series", [S("c10-maths", "Numbers and Sequences")], []),
            ("Mensuration", [S("c6-t2-maths", "Measurements"), S("c6-t3-maths", "Perimeter"), S("c7-maths", "Measurements"), S("c8-maths", "Measurements"),
                             S("c9-maths", "Mensuration"), S("c10-maths", "Mensuration")], []),
            ("Simplification", [S("c6-t1-maths", "^Numbers"), S("c6-t3-maths", "Fractions|Integers"), S("c7-maths", "Number System|Algebra"),
                                S("c8-maths", "Numbers|Algebra"), S("c9-maths", "Real Number|Algebra"), S("c10-maths", "Algebra")], []),
            ("Arithmetic and geometric progressions", [S("c10-maths", "Numbers and Sequences")], []),
            ("Reasoning (logical reasoning, puzzles, dice, visual reasoning, alpha-numeric reasoning, number series)", [],
             ["Not in SCERT books: practise with the Reasoning questions in Quiz"]),
        ]},
    ]},
]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    books = json.loads((CONTENT / "books.json").read_text(encoding="utf-8"))["books"]
    by_book = {b["id"]: b["chapters"] for b in books}
    missing = []

    def resolve(sources):
        ids = []
        for book, rx in sources:
            chs = by_book.get(book)
            if chs is None:
                missing.append(f"book {book}")
                continue
            hits = [c["id"] for c in chs if re.search(rx, c["title"], re.I)]
            if not hits:
                missing.append(f"{book} /{rx}/")
            ids += [h for h in hits if h not in ids]
        return ids

    out = {"exam": "Group I, II & II-A", "stage": "prelims", "units": []}
    n_topics = 0
    for u in PRELIMS:
        unit = {"code": u["code"], "title": u["title"], "sections": []}
        for sec in u["sections"]:
            topics = []
            for i, (text, sources, other) in enumerate(sec["topics"], 1):
                topics.append({"no": i, "text": text, "chapters": resolve(sources), "other": other})
                n_topics += 1
            unit["sections"].append({"title": sec["title"], "topics": topics})
        out["units"].append(unit)
    (CONTENT / "syllabus.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{n_topics} topics written to app/public/content/syllabus.json")
    if missing:
        print("UNRESOLVED:", *missing, sep="\n  ")
        sys.exit(1)


if __name__ == "__main__":
    main()
