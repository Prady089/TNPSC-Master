"""Writes app/public/content/demo-questions.json - a small hand-checked question
set so the app is usable in demo mode before the AI question bank is built."""
import json
from pathlib import Path

Q = []


def add(unit, ch, q, opts, ans, exp, d=1):
    n = sum(1 for x in Q if x["unit_code"] == unit) + 1
    Q.append({"id": f"demo-{unit.lower()}-{n}", "unit_code": unit, "chapter_id": ch, "question": q, "options": opts,
              "answer_index": ans, "explanation": exp, "difficulty": d, "source": "manual", "status": "approved"})


# GS4 Polity
add("GS4", "c12-pol-01", "The Constituent Assembly of India held its first meeting on", ["26 November 1949", "9 December 1946", "26 January 1950", "15 August 1947"], 1, "The Constituent Assembly first met on 9 December 1946; the Constitution was adopted on 26 November 1949.")
add("GS4", "c12-pol-01", "Who was the Chairman of the Drafting Committee of the Indian Constitution?", ["Dr. Rajendra Prasad", "Dr. B.R. Ambedkar", "Jawaharlal Nehru", "B.N. Rau"], 1, "Dr. B.R. Ambedkar chaired the Drafting Committee; Dr. Rajendra Prasad was President of the Constituent Assembly.")
add("GS4", "c12-pol-01", "Which Article of the Constitution guarantees the Right to Constitutional Remedies?", ["Article 14", "Article 21", "Article 32", "Article 44"], 2, "Article 32 lets citizens move the Supreme Court to enforce Fundamental Rights. Dr. Ambedkar called it the 'heart and soul' of the Constitution.", 2)
add("GS4", "c12-pol-01", "The idea of Directive Principles of State Policy was borrowed from the Constitution of", ["USA", "United Kingdom", "Ireland", "Canada"], 2, "The Directive Principles (Part IV) were inspired by the Irish Constitution.", 2)
add("GS4", "c10-ss-19", "The minimum age to become a member of the Lok Sabha is", ["18 years", "21 years", "25 years", "30 years"], 2, "A candidate for the Lok Sabha must be at least 25 years old; for the Rajya Sabha, 30 years.")
add("GS4", "c8-ss-17", "The Governor of a State is appointed by the", ["Chief Minister", "Prime Minister", "President", "Chief Justice of the High Court"], 2, "Under Article 155, the Governor is appointed by the President.")
add("GS4", "c9-ss-24", "The 73rd Constitutional Amendment Act (1992) deals with", ["Municipalities", "Panchayati Raj", "Anti-defection", "Goods and Services Tax"], 1, "The 73rd Amendment gave constitutional status to Panchayati Raj institutions; the 74th dealt with municipalities.", 2)
add("GS4", "c12-pol-04", "Which writ is issued to free a person who has been illegally detained?", ["Mandamus", "Habeas Corpus", "Certiorari", "Quo Warranto"], 1, "Habeas Corpus ('to have the body') orders the detaining authority to produce the person before the court.", 2)
# GS6 Tamil Nadu history & culture
add("GS6", "c10-ss-10", "The South Indian Liberal Federation (Justice Party) was founded in", ["1916", "1920", "1925", "1938"], 0, "The South Indian Liberal Federation, later called the Justice Party, was formed in 1916.")
add("GS6", "c10-ss-10", "The Self-Respect Movement was started in 1925 by", ["C.N. Annadurai", "E.V. Ramasamy (Periyar)", "Rettaimalai Srinivasan", "Iyothee Thass"], 1, "Periyar E.V. Ramasamy launched the Self-Respect Movement in 1925.")
add("GS6", "c9-ss-03", "How many couplets (kurals) are there in the Thirukkural?", ["1000", "1330", "1500", "133"], 1, "The Thirukkural has 133 chapters of 10 couplets each, i.e. 1330 couplets.")
add("GS6", "c10-ss-06", "The Vellore Mutiny took place in", ["1799", "1801", "1806", "1857"], 2, "The Vellore Mutiny of 1806 is considered an early revolt against British rule.")
add("GS6", "c10-ss-06", "Veerapandiya Kattabomman was the palayakkarar of", ["Sivagangai", "Panchalankurichi", "Nerkattumseval", "Ramanathapuram"], 1, "Kattabomman ruled Panchalankurichi and was hanged by the British at Kayathar in 1799.", 2)
add("GS6", "c9-ss-03", "Tolkappiyam is primarily a work on", ["Grammar", "Ethics", "Medicine", "Astronomy"], 0, "Tolkappiyam is the oldest extant Tamil grammar.")
add("GS6", "c10-ss-10", "The first Communal Government Order providing reservation in the Madras Presidency was issued in", ["1921", "1928", "1947", "1951"], 0, "The Justice Party government issued the first Communal G.O. in 1921.", 3)
# GS3 Indian history
add("GS3", "c11-his-01", "Harappa was first excavated in 1921 under the direction of", ["R.D. Banerji", "Daya Ram Sahni", "John Marshall", "Mortimer Wheeler"], 1, "Daya Ram Sahni excavated Harappa in 1921; R.D. Banerji excavated Mohenjo-daro in 1922.", 2)
add("GS3", "c11-his-01", "The 'Great Bath' of the Indus Civilisation was found at", ["Harappa", "Lothal", "Mohenjo-daro", "Kalibangan"], 2, "The Great Bath is at Mohenjo-daro.")
add("GS3", "c12-his-02", "The Partition of Bengal (1905) was carried out under Viceroy", ["Lord Ripon", "Lord Curzon", "Lord Minto", "Lord Dalhousie"], 1, "Lord Curzon partitioned Bengal in 1905, which triggered the Swadeshi Movement.")
add("GS3", "c12-his-02", "Who presided over the first session of the Indian National Congress (1885)?", ["Dadabhai Naoroji", "W.C. Bonnerjee", "A.O. Hume", "Surendranath Banerjee"], 1, "The first session, in Bombay in 1885, was presided over by W.C. Bonnerjee.", 2)
add("GS3", "c11-his-07", "The Allahabad Pillar Inscription praising Samudragupta was composed by", ["Kalidasa", "Harisena", "Banabhatta", "Aryabhata"], 1, "Harisena, Samudragupta's court poet, composed the Prayaga Prasasti.", 2)
add("GS3", None, "The Dandi March (Salt Satyagraha) began in", ["1920", "1927", "1930", "1942"], 2, "Gandhi began the Dandi March on 12 March 1930.")
# GS5 Economy & TN development administration
add("GS5", None, "NITI Aayog replaced the Planning Commission in", ["2010", "2014", "2015", "2017"], 2, "NITI Aayog was set up on 1 January 2015.")
add("GS5", None, "The Goods and Services Tax (GST) came into force in India on", ["1 April 2016", "1 July 2017", "1 January 2018", "1 April 2017"], 1, "GST was rolled out on 1 July 2017, following the 101st Constitutional Amendment.")
add("GS5", None, "The Reserve Bank of India was established in", ["1935", "1947", "1949", "1969"], 0, "The RBI was set up in 1935 and nationalised in 1949.")
add("GS5", "c10-ss-25", "What type of Public Distribution System does Tamil Nadu follow?", ["Targeted PDS", "Universal PDS", "Means-tested PDS only", "Cash voucher system"], 1, "Tamil Nadu follows a universal PDS, unlike the targeted PDS adopted by most states.", 2)
add("GS5", None, "MGNREGA guarantees each rural household how many days of wage employment in a year?", ["50", "100", "150", "365"], 1, "MGNREGA (2005) guarantees 100 days of wage employment a year.")
add("GS5", None, "Tamil Nadu's Nutritious Noon Meal Programme was launched in 1982 under Chief Minister", ["C.N. Annadurai", "M. Karunanidhi", "M.G. Ramachandran", "J. Jayalalithaa"], 2, "M.G. Ramachandran launched the programme in 1982, expanding the midday meal scheme started under K. Kamaraj.", 2)
# GS1 General Science
add("GS1", "c8-sci-01", "The SI unit of luminous intensity is", ["Lumen", "Lux", "Candela", "Watt"], 2, "The candela is the SI base unit of luminous intensity.")
add("GS1", "c10-sci-18", "Who is known as the Father of Genetics?", ["Charles Darwin", "Gregor Mendel", "T.H. Morgan", "James Watson"], 1, "Gregor Mendel's experiments on pea plants laid the foundations of genetics.")
add("GS1", "c10-sci-06", "Nuclear power reactors generate energy through", ["Nuclear fusion", "Nuclear fission", "Chemical combustion", "Photosynthesis"], 1, "Present-day nuclear reactors use controlled fission of uranium or plutonium.")
add("GS1", None, "Deficiency of Vitamin D in children causes", ["Scurvy", "Beriberi", "Rickets", "Night blindness"], 2, "Vitamin D deficiency causes rickets.")
add("GS1", None, "The Kudankulam Nuclear Power Plant is located in which district of Tamil Nadu?", ["Chengalpattu", "Tirunelveli", "Thoothukudi", "Kanyakumari"], 1, "Kudankulam is in Tirunelveli district.", 2)
# GS2 Geography
add("GS2", "c10-ss-16", "The highest peak in Tamil Nadu is", ["Anamudi", "Doddabetta", "Mahendragiri", "Velliangiri"], 1, "Doddabetta (2,637 m) in the Nilgiris is the highest peak in Tamil Nadu. Anamudi is in Kerala.")
add("GS2", "c10-ss-16", "Tamil Nadu receives most of its annual rainfall from the", ["South-West Monsoon", "North-East Monsoon", "Western Disturbances", "Convectional rainfall"], 1, "Most of Tamil Nadu's rain comes from the North-East Monsoon (October–December).")
add("GS2", None, "Which strait separates India from Sri Lanka?", ["Palk Strait", "Strait of Malacca", "Strait of Hormuz", "Bab-el-Mandeb"], 0, "The Palk Strait lies between Tamil Nadu and northern Sri Lanka.")
add("GS2", "c10-ss-13", "Black soil is best suited for growing", ["Rice", "Tea", "Cotton", "Jute"], 2, "Black (regur) soil holds moisture well and is ideal for cotton.")
add("GS2", "c11-geo-06", "The ozone layer is found mainly in the", ["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere"], 1, "The ozone layer lies in the stratosphere and absorbs ultraviolet radiation.")
# APT Aptitude
add("APT", "c8-maths-01", "What is 20% of 250?", ["25", "40", "50", "60"], 2, "20/100 × 250 = 50.")
add("APT", None, "Simple interest on ₹5,000 at 8% per annum for 3 years is", ["₹1,000", "₹1,200", "₹1,250", "₹1,500"], 1, "SI = P×R×T/100 = 5000×8×3/100 = ₹1,200.")
add("APT", None, "The LCM of 12 and 18 is", ["6", "36", "72", "216"], 1, "12 = 2²×3 and 18 = 2×3², so LCM = 2²×3² = 36.")
add("APT", None, "A can finish a job in 10 days and B in 15 days. Working together, they finish it in", ["5 days", "6 days", "8 days", "12.5 days"], 1, "Together they do 1/10 + 1/15 = 1/6 of the job per day, so 6 days.", 2)
add("APT", None, "₹64 is divided in the ratio 3 : 5. The larger share is", ["₹24", "₹32", "₹40", "₹48"], 2, "The larger share is 5/8 × 64 = ₹40.")
# RSN Reasoning
add("RSN", None, "Find the next number: 2, 6, 12, 20, 30, ?", ["36", "40", "42", "48"], 2, "The differences are 4, 6, 8, 10, so the next is 12: 30 + 12 = 42.")
add("RSN", None, "If CAT is coded as DBU, how is DOG coded?", ["EPH", "DPG", "EOH", "FPH"], 0, "Each letter moves forward by one: D→E, O→P, G→H.")
add("RSN", None, "Find the odd one out: 121, 144, 169, 180", ["121", "144", "169", "180"], 3, "121, 144 and 169 are perfect squares (11², 12², 13²); 180 is not.")
add("RSN", None, "A is B's brother and B is C's mother. How is A related to C?", ["Father", "Uncle", "Brother", "Grandfather"], 1, "A is the brother of C's mother, so A is C's (maternal) uncle.", 2)
add("RSN", None, "Find the next letter: A, C, F, J, ?", ["M", "N", "O", "P"], 2, "The gaps are +2, +3, +4, +5: J + 5 = O.", 2)

out = Path(__file__).resolve().parent.parent / "app" / "public" / "content" / "demo-questions.json"
out.write_text(json.dumps(Q, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(Q), "demo questions ->", out)
