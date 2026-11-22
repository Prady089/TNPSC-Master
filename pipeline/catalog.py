"""Book catalog and TNPSC Group 1 syllabus mapping used by the content pipeline.

Only books we are allowed to redistribute are listed here (Tamil Nadu SCERT
government textbooks). Tamil-medium books are listed with `enabled=False`
until the Tamil OCR step exists.
"""

# Prelims syllabus units (Notification 05/2026 pattern: 175 GS + 25 aptitude).
# `weight` = number of questions in the real exam; used to weight the daily quiz.
UNITS = [
    {"code": "GS1", "part": "A", "weight": 10, "title": "General Science"},
    {"code": "GS2", "part": "A", "weight": 10, "title": "Geography of India"},
    {"code": "GS3", "part": "A", "weight": 25, "title": "History, Culture of India & Indian National Movement"},
    {"code": "GS4", "part": "A", "weight": 40, "title": "Indian Polity"},
    {"code": "GS5", "part": "A", "weight": 50, "title": "Indian Economy & Development Administration in Tamil Nadu"},
    {"code": "GS6", "part": "A", "weight": 40, "title": "History, Culture, Heritage & Socio-Political Movements in Tamil Nadu"},
    {"code": "APT", "part": "B", "weight": 15, "title": "Aptitude"},
    {"code": "RSN", "part": "B", "weight": 10, "title": "Reasoning & Mental Ability"},
]

# Default syllabus unit for a chapter, by subject. The AI enrichment step can
# add a second unit (e.g. a Tamil Nadu history chapter also maps to GS6).
SUBJECT_UNIT = {
    "science": "GS1",
    "geography": "GS2",
    "history": "GS3",
    "civics": "GS4",
    "political-science": "GS4",
    "economics": "GS5",
    "maths": "APT",
}

# subject=None means "detect per chapter from the bookmark title" (combined books).
BOOKS = [
    {"id": "c6-sci-ss", "file": "TN-SCERT CLASS 6TH SOCIAL SCIENCE & SCIENCE (ENGLISH).pdf", "std": 6, "title": "Science & Social Science", "subject": None},
    {"id": "c7-sci-ss", "file": "TN-SCERT CLASS 7TH SOCIAL SCIENCE & SCIENCE ( ENGLISH ).pdf", "std": 7, "title": "Science & Social Science", "subject": None},
    {"id": "c7-maths", "file": "TN-SCERT CLASS 7TH MATHS ( ENGLISH).pdf", "std": 7, "title": "Mathematics", "subject": "maths"},
    {"id": "c8-sci", "file": "TN-SCERT CLASS 8TH SCIENCE (ENGLISH).pdf", "std": 8, "title": "Science", "subject": "science"},
    {"id": "c8-ss", "file": "TN-SCERT CLASS 8TH SOCIAL SCIENCE (ENGLISH).pdf", "std": 8, "title": "Social Science", "subject": None},
    {"id": "c8-maths", "file": "TN-SCERT CLASS 8TH MATHS (ENGLISH).pdf", "std": 8, "title": "Mathematics", "subject": "maths"},
    {"id": "c9-sci", "file": "TN-SCERT CLASS 9TH SCERT ( SCIENCE).pdf", "std": 9, "title": "Science", "subject": "science"},
    {"id": "c9-ss", "file": "TN-SCERT CLASS 9TH SOCIAL SCIENCE (ENGLISH).pdf", "std": 9, "title": "Social Science", "subject": None},
    {"id": "c10-sci", "file": "TN-SCERT CLASS 10TH SCIENCE (ENGLISH).pdf", "std": 10, "title": "Science", "subject": "science"},
    {"id": "c10-ss", "file": "TN-SCERT CLASS 10TH SOCIAL SCIENCE (ENGLISH).pdf", "std": 10, "title": "Social Science", "subject": None},
    {"id": "c11-his", "file": "TN-SCERT CLASS 11TH HISTORY (ENGLISH).pdf", "std": 11, "title": "History", "subject": "history"},
    {"id": "c11-geo", "file": "TN-SCERT CLASS 11TH GEOGRAPHY (ENGLISH).pdf", "std": 11, "title": "Geography", "subject": "geography"},
    {"id": "c11-pol", "file": "TN-SCERT CLASS 11TH POLITICAL SCIENCE (ENGLISH).pdf", "std": 11, "title": "Political Science", "subject": "political-science"},
    {"id": "c12-his", "file": "TN-SCERT CLASS 12TH HISTORY (ENGLISH).pdf", "std": 12, "title": "History", "subject": "history"},
    {"id": "c12-geo", "file": "TN-SCERT CLASS 12TH GEOGRAPHY (ENGLISH).pdf", "std": 12, "title": "Geography", "subject": "geography"},
    {"id": "c12-pol", "file": "TN-SCERT CLASS 12TH POLITICAL SCIENCE (ENGLISH).pdf", "std": 12, "title": "Political Science", "subject": "political-science"},
    # Added 2026-11-22 from the official TN textbook store (d1e5r329t7a85t.cloudfront.net/syllabuspdf) to fill syllabus gaps.
    {"id": "c9-maths", "file": "books/9-maths.pdf", "std": 9, "title": "Mathematics", "subject": "maths"},
    {"id": "c11-eco", "file": "books/11-economics.pdf", "std": 11, "title": "Economics", "subject": "economics"},
    {"id": "c11-phy2", "file": "books/11-physics-vol2.pdf", "std": 11, "title": "Physics Vol 2", "subject": "science"},
    {"id": "c11-chem1", "file": "books/11-chemistry-vol1.pdf", "std": 11, "title": "Chemistry Vol 1", "subject": "science"},
    {"id": "c11-chem2", "file": "books/11-chemistry-vol2.pdf", "std": 11, "title": "Chemistry Vol 2", "subject": "science"},
    {"id": "c11-bot", "file": "books/11-botany.pdf", "std": 11, "title": "Botany", "subject": "science"},
    {"id": "c11-zoo", "file": "books/11-zoology.pdf", "std": 11, "title": "Zoology", "subject": "science"},
    {"id": "c12-eco", "file": "books/12-economics.pdf", "std": 12, "title": "Economics", "subject": "economics"},
    {"id": "c12-phy1", "file": "books/12-physics-vol1.pdf", "std": 12, "title": "Physics Vol 1", "subject": "science"},
    {"id": "c12-phy2", "file": "books/12-physics-vol2.pdf", "std": 12, "title": "Physics Vol 2", "subject": "science"},
    {"id": "c12-chem1", "file": "books/12-chemistry-vol1.pdf", "std": 12, "title": "Chemistry Vol 1", "subject": "science"},
    {"id": "c12-bot", "file": "books/12-botany.pdf", "std": 12, "title": "Botany", "subject": "science"},
    {"id": "c12-zoo", "file": "books/12-zoology.pdf", "std": 12, "title": "Zoology", "subject": "science"},
]
