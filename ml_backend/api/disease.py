DISEASE_INFO = {
    "rice__Bacterial_leaf_blight": {
        "details": "Caused by Xanthomonas oryzae pv. oryzae. Creates water-soaked lesions that turn yellow then white along leaf margins, severely reducing photosynthesis.",
        "preventive": "Use resistant varieties, avoid excessive nitrogen, maintain proper spacing, drain fields periodically, apply copper-based bactericides.",
        "severity": "critical",
    },
    "rice__Brown_spot": {
        "details": "Caused by Bipolaris oryzae. Forms brown oval lesions on leaves and grains, reducing plant vigor and grain quality significantly.",
        "preventive": "Apply balanced NPK fertilization, avoid water stress, use certified seeds, treat seeds with fungicides before planting.",
        "severity": "warning",
    },
    "rice__Leaf_smut": {
        "details": "Caused by Entyloma oryzae. Produces small, angular, black spots on leaf blades that may merge causing leaf death.",
        "preventive": "Rotate crops, use disease-free seeds, apply systemic fungicides, maintain field hygiene.",
        "severity": "warning",
    },
    "cotton__Bacterial_blight": {
        "details": "Caused by Xanthomonas citri pv. malvacearum. Creates angular water-soaked lesions that turn brown, causing defoliation and boll rot.",
        "preventive": "Plant resistant varieties, treat seeds with acid or chemicals, avoid overhead irrigation, apply copper-based bactericides.",
        "severity": "critical",
    },
    "cotton__curl_virus": {
        "details": "Cotton Leaf Curl Virus transmitted by whiteflies. Causes upward or downward leaf curling, thickening of veins, stunting growth.",
        "preventive": "Plant resistant varieties, control whitefly populations with systemic insecticides, remove affected plants, use reflective mulches.",
        "severity": "critical",
    },
    "cotton__fussarium_wilt": {
        "details": "Caused by Fusarium oxysporum. Causes yellowing and wilting, internal discoloration of stem vascular tissue.",
        "preventive": "Use resistant varieties, practice crop rotation (3+ years), treat seeds with biocontrol agents, improve soil drainage.",
        "severity": "critical",
    },
    "sugarcane__Bacterial_blight": {
        "details": "Caused by Acidovorax avenae. Produces water-soaked streaks that turn red-brown with yellow margins, reducing photosynthesis.",
        "preventive": "Use disease-free planting material, practice crop sanitation, apply copper-based bactericides, avoid mechanical injury.",
        "severity": "warning",
    },
    "sugarcane__Red_rot": {
        "details": "Caused by Colletotrichum falcatum. Internal reddening of stalk tissues with white patches, causing stalk rot and yield loss.",
        "preventive": "Plant disease-free resistant varieties, treat setts with fungicide, avoid waterlogging, practice crop rotation.",
        "severity": "critical",
    },
    "sugarcane__Yellow_leaf": {
        "details": "Caused by Sugarcane Yellow Leaf Virus (SCYLV) transmitted by aphids. Yellowing of midribs and leaf blades from tips.",
        "preventive": "Plant virus-free certified material, control aphid vectors, rogue infected plants, practice field sanitation.",
        "severity": "warning",
    },
}

HEALTHY_INFO = {
    "details": "No disease symptoms detected. Your crop appears healthy.",
    "preventive": "Continue current good agricultural practices.",
    "severity": "healthy",
}

_DISEASE_INFO_LOWER = {k.lower(): v for k, v in DISEASE_INFO.items()}

def get_disease_info(label: str) -> dict:
    if "healthy" in label.lower():
        return HEALTHY_INFO
    
    return (
        DISEASE_INFO.get(label)
        or _DISEASE_INFO_LOWER.get(label.lower())
        or {
            "details": "A crop disease has been detected. Consult an agricultural expert.",
            "preventive": "Follow good agricultural practices.",
            "severity": "warning",
        }
    )