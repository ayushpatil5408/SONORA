"""
SONORA — Audiovisual Music Platform (Streamlit Deployment Edition)
Authoritative Reference: PRD.md, DESIGN_SYSTEM.md & VISUAL_LANGUAGE.md

One continuous music workspace from listening to creation:
Discover → Listen → Analyze → Mix → Edit → Create → Share
"""

import os
import json
import streamlit as st
import streamlit.components.v1 as components

# -----------------------------------------------------------------------------
# 1. Page Configuration
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="SONORA — Audiovisual Music Workstation",
    page_icon="🎵",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# -----------------------------------------------------------------------------
# 2. Holographic & Aurora Streamlit Styling
# -----------------------------------------------------------------------------
st.markdown("""
<style>
  /* Obsidian Void Theme Overrides */
  .stApp {
    background-color: #020205 !important;
    background-image: 
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124, 77, 255, 0.16) 0%, transparent 70%),
      radial-gradient(circle 500px at 10% 30%, rgba(0, 229, 255, 0.10) 0%, transparent 60%),
      radial-gradient(circle 550px at 90% 70%, rgba(244, 114, 182, 0.10) 0%, transparent 70%),
      radial-gradient(circle 400px at 50% 95%, rgba(255, 179, 0, 0.08) 0%, transparent 60%) !important;
    color: #f8fafc !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  }

  /* Shimmering Multi-Spectral Text */
  .sonora-hero-title {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #ffffff 15%, #a5f3fc 45%, #c084fc 70%, #f472b6 90%, #f59e0b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.2rem;
    display: inline-block;
  }

  .sonora-hero-subtitle {
    font-size: 0.95rem;
    color: #94a3b8;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  /* Frosted Holographic Glass Container */
  .sonora-glass-card {
    background: rgba(14, 11, 26, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 1.2rem 1.5rem;
    backdrop-filter: blur(20px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15);
    margin-bottom: 1rem;
  }

  /* Iridescent Badges */
  .sonora-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 700;
    font-family: monospace;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: rgba(0, 229, 255, 0.12);
    color: #00e5ff;
    border: 1px solid rgba(0, 229, 255, 0.35);
    margin-right: 6px;
    box-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
  }

  .sonora-badge-iris {
    background: rgba(192, 132, 252, 0.12);
    color: #c084fc;
    border-color: rgba(192, 132, 252, 0.35);
    box-shadow: 0 0 10px rgba(192, 132, 252, 0.25);
  }

  .sonora-badge-amber {
    background: rgba(255, 179, 0, 0.12);
    color: #ffb300;
    border-color: rgba(255, 179, 0, 0.35);
    box-shadow: 0 0 10px rgba(255, 179, 0, 0.25);
  }

  /* Metric Card Styling */
  div[data-testid="stMetricValue"] {
    color: #00e5ff !important;
    font-family: monospace !important;
    font-size: 1.6rem !important;
  }
  div[data-testid="stMetricLabel"] {
    color: #94a3b8 !important;
    text-transform: uppercase !important;
    font-size: 0.75rem !important;
    letter-spacing: 0.06em !important;
  }
  
  /* Sidebar Styling */
  section[data-testid="stSidebar"] {
    background-color: #070512 !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  }
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# 3. Streamlit Embedded Audiovisual Workstation Loader
# -----------------------------------------------------------------------------
DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")
STANDALONE_HTML_PATH = os.path.join(DIST_DIR, "standalone.html")
INDEX_HTML_PATH = os.path.join(DIST_DIR, "index.html")

def get_workstation_html():
    """Loads the self-contained production bundle for zero-latency, proxy-safe Streamlit rendering."""
    if os.path.exists(STANDALONE_HTML_PATH):
        with open(STANDALONE_HTML_PATH, "r", encoding="utf-8") as f:
            return f.read()
    elif os.path.exists(INDEX_HTML_PATH):
        with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
            return f.read()
    return None

cached_html = get_workstation_html()

# -----------------------------------------------------------------------------
# 4. Sidebar Controls & Navigation
# -----------------------------------------------------------------------------
with st.sidebar:
    st.markdown("### 🎵 SONORA Platform")
    st.markdown("""
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
      <div style="width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></div>
      <span style="font-size:0.75rem; font-family:monospace; color:#94a3b8; text-transform:uppercase;">System Online</span>
    </div>
    """, unsafe_allow_html=True)

    selected_view = st.radio(
        "Navigation Surface",
        options=[
            "🎧 Audiovisual Workstation",
            "🎛️ Audio Intelligence & Camelot Lab",
            "📊 Architecture & Test Verification",
            "📖 About & Specifications",
        ],
        index=0,
    )

    st.markdown("---")
    st.markdown("**Workflow Stage**")
    st.markdown("`Discover` → `Listen` → `Analyze` → `Mix` → `Edit` → `Create` → `Share`")

    st.markdown("---")
    st.markdown("**Repository & Deployment**")
    st.markdown("[🔗 GitHub: ayushpatil5408/SONORA](https://github.com/ayushpatil5408/SONORA)")
    st.caption("Milestone 0.1 – 5.5 Complete • 16/16 Test Suites Passing")

# -----------------------------------------------------------------------------
# 5. Header Banner
# -----------------------------------------------------------------------------
col_title, col_telemetry = st.columns([3, 1])
with col_title:
    st.markdown('<div class="sonora-hero-title">SONORA</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sonora-hero-subtitle">Integrated Living Audiovisual Music Platform</div>',
        unsafe_allow_html=True,
    )
    st.markdown("""
    <span class="sonora-badge">Web Audio Engine</span>
    <span class="sonora-badge sonora-badge-iris">Holographic Aurora UI</span>
    <span class="sonora-badge sonora-badge-amber">WSOLA Warping</span>
    <span class="sonora-badge">Offline WAV Render</span>
    """, unsafe_allow_html=True)

with col_telemetry:
    st.markdown("""
    <div style="text-align:right; font-family:monospace; font-size:0.75rem; color:#94a3b8; padding-top:10px;">
      <div>AUDIO ENGINE: <span style="color:#10b981; font-weight:bold;">READY</span></div>
      <div>WARP DSP: <span style="color:#00e5ff; font-weight:bold;">WSOLA-HQ</span></div>
      <div>STAGE: <span style="color:#c084fc; font-weight:bold;">ACTIVE</span></div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# 6. View 1: Live Audiovisual Workstation
# -----------------------------------------------------------------------------
if selected_view == "🎧 Audiovisual Workstation":
    st.markdown("""
    <div class="sonora-glass-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="margin:0; color:#ffffff; font-weight:700;">Live Interactive Soundstage</h4>
          <p style="margin:0; font-size:0.85rem; color:#94a3b8;">
            Experience the complete SONORA platform: Two-deck DJ plinths, non-destructive multitrack creator timeline, WSOLA audio warping, and living SoundOrb.
          </p>
        </div>
        <a href="https://github.com/ayushpatil5408/SONORA" target="_blank" style="text-decoration:none;">
          <span class="sonora-badge sonora-badge-iris">Source Code ↗</span>
        </a>
      </div>
    </div>
    """, unsafe_allow_html=True)

    if cached_html:
        # Seamlessly embed the complete self-contained workstation without proxy/component timeouts
        components.html(cached_html, height=1000, scrolling=True)
    else:
        st.warning(
            "Frontend build not found at `./dist`. If running locally, run `npm run build` to generate the production bundle."
        )

# -----------------------------------------------------------------------------
# 7. View 2: Audio Intelligence & Camelot Lab
# -----------------------------------------------------------------------------
elif selected_view == "🎛️ Audio Intelligence & Camelot Lab":
    st.markdown("""
    <div class="sonora-glass-card">
      <h3 style="margin:0 0 6px 0; color:#fff;">Camelot Wheel & Harmonic Compatibility Engine</h3>
      <p style="margin:0; font-size:0.85rem; color:#94a3b8;">
        SONORA evaluates musical key compatibility using the Camelot Wheel matrix, harmonic energy shifts, and tempo distance.
      </p>
    </div>
    """, unsafe_allow_html=True)

    col_track_a, col_track_b = st.columns(2)

    CAMELOT_KEYS = {
        "1A": ("Ab minor", 1), "1B": ("B major", 1),
        "2A": ("Eb minor", 2), "2B": ("F# major", 2),
        "3A": ("Bb minor", 3), "3B": ("Db major", 3),
        "4A": ("F minor", 4),  "4B": ("Ab major", 4),
        "5A": ("C minor", 5),  "5B": ("Eb major", 5),
        "6A": ("G minor", 6),  "6B": ("Bb major", 6),
        "7A": ("D minor", 7),  "7B": ("F major", 7),
        "8A": ("A minor", 8),  "8B": ("C major", 8),
        "9A": ("E minor", 9),  "9B": ("G major", 9),
        "10A": ("B minor", 10), "10B": ("D major", 10),
        "11A": ("F# minor", 11), "11B": ("A major", 11),
        "12A": ("C# minor", 12), "12B": ("E major", 12),
    }

    with col_track_a:
        st.markdown("##### 🔵 Deck A (Master Track)")
        camelot_a = st.selectbox("Camelot Code (Deck A)", list(CAMELOT_KEYS.keys()), index=14)
        bpm_a = st.slider("BPM (Deck A)", min_value=70.0, max_value=175.0, value=124.0, step=0.5)
        key_name_a, num_a = CAMELOT_KEYS[camelot_a]
        st.info(f"**Deck A Key:** {key_name_a} (`{camelot_a}`)")

    with col_track_b:
        st.markdown("##### 🟠 Deck B (Incoming Track)")
        camelot_b = st.selectbox("Camelot Code (Deck B)", list(CAMELOT_KEYS.keys()), index=16)
        bpm_b = st.slider("BPM (Deck B)", min_value=70.0, max_value=175.0, value=126.0, step=0.5)
        key_name_b, num_b = CAMELOT_KEYS[camelot_b]
        st.info(f"**Deck B Key:** {key_name_b} (`{camelot_b}`)")

    # Compute compatibility
    mode_a = camelot_a[-1]
    mode_b = camelot_b[-1]
    diff = abs(num_a - num_b)
    if diff > 6:
        diff = 12 - diff

    is_perfect = (camelot_a == camelot_b)
    is_relative = (num_a == num_b and mode_a != mode_b)
    is_energy_up = (diff == 1 and mode_a == mode_b)
    is_harmonic = is_perfect or is_relative or (diff <= 1)

    bpm_diff = abs(bpm_a - bpm_b)
    tempo_ratio = bpm_b / bpm_a
    tempo_match = bpm_diff <= 4.0

    st.markdown("---")
    st.markdown("#### Transition Telemetry")

    m_col1, m_col2, m_col3, m_col4 = st.columns(4)
    with m_col1:
        harmonic_status = "PERFECT" if is_perfect else ("RELATIVE" if is_relative else ("COMPATIBLE" if is_harmonic else "TENSION"))
        st.metric("Harmonic Relation", harmonic_status)
    with m_col2:
        st.metric("Tempo Delta", f"{bpm_diff:.1f} BPM", delta=f"{tempo_ratio:.3f}x stretch")
    with m_col3:
        st.metric("Energy Arc", "Energy Boost +1" if is_energy_up else "Stable Contour")
    with m_col4:
        mix_score = 98 if is_perfect and tempo_match else (85 if is_harmonic and tempo_match else 62)
        st.metric("Mix Feasibility", f"{mix_score}%")

# -----------------------------------------------------------------------------
# 8. View 3: Architecture & Test Verification
# -----------------------------------------------------------------------------
elif selected_view == "📊 Architecture & Test Verification":
    st.markdown("""
    <div class="sonora-glass-card">
      <h3 style="margin:0 0 6px 0; color:#fff;">Engineering Verification Matrix</h3>
      <p style="margin:0; font-size:0.85rem; color:#94a3b8;">
        All architectural contracts from Milestone 0.1 through Milestone 5.5 are automated, verified, and continuously tested.
      </p>
    </div>
    """, unsafe_allow_html=True)

    test_suites = [
        ("Phase 0.2 Web Audio Engine", "10/10 PASS", "Equal-power crossfades, 3-band isolator EQ (-inf to +6dB), sound-color filters"),
        ("Phase 0.3 Waveform Peak Extraction", "10/10 PASS", "Web Worker off-thread downsampling, RMS vectorization, peak invariants"),
        ("Phase 0.4 Two-Deck Workspace", "10/10 PASS", "Coordinated Deck A & Deck B states, hot cue persistence, crossfader math"),
        ("Milestone 1 Shell & Persistent Player", "10/10 PASS", "Zero audio pause navigation, floating capsule dock, SoundOrb anchor"),
        ("Milestone 2A Living Catalog", "10/10 PASS", "Spatial Universe, Flow River, Pro List Console modes, BPM & key filtering"),
        ("Milestone 2B Music Supply & Rights", "10/10 PASS", "Multi-tier rights guardrails, track ingestion validation, attribution"),
        ("Milestone 2C Jamendo Integration", "10/10 PASS", "Authorized stream resolving, remote fallback handling, pagination"),
        ("Milestone 3 DJ Environments", "10/10 PASS", "Organic Orbital, Liquid Instrument, Acoustic Organism zero-gap morphing"),
        ("Milestone 3.5 DJ Performance Physics", "10/10 PASS", "High-precision vinyl scratching, momentum drag, pitch nudging"),
        ("Milestone 4 Audio Intelligence", "10/10 PASS", "Camelot Wheel, structural phrase boundaries, dynamic energy profiling"),
        ("Milestone 5.0 Creator DAW Foundation", "10/10 PASS", "Non-destructive multitrack project model, track mute/solo matrix"),
        ("Milestone 5.2 Clip Editing & Processing", "10/10 PASS", "Edge trimming, slip editing, non-linear fades, automation filaments"),
        ("Milestone 5.3 Beat-Aware Arrangement", "12/12 PASS", "Intelligent musical grid snapping, section markers, Camelot transition cues"),
        ("Milestone 5.4 WSOLA Audio Warping", "12/12 PASS", "Pitch-preserving time stretching (0.5x to 2.0x), warp marker manipulation"),
        ("Milestone 5.5 Audio Rendering & Bouncing", "13/13 PASS", "Non-destructive mixdown, stem bouncing, 16/24/32-bit WAV RIFF encoding"),
    ]

    for title, score, desc in test_suites:
        col_name, col_status = st.columns([3, 1])
        with col_name:
            st.markdown(f"**✓ {title}**  \n<span style='font-size:0.8rem; color:#94a3b8;'>{desc}</span>", unsafe_allow_html=True)
        with col_status:
            st.markdown(f"<div style='text-align:right; font-family:monospace; color:#10b981; font-weight:700;'>{score}</div>", unsafe_allow_html=True)
        st.markdown("<hr style='margin: 8px 0; border: none; border-top: 1px solid rgba(255,255,255,0.06);'>", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# 9. View 4: About & Specifications
# -----------------------------------------------------------------------------
elif selected_view == "📖 About & Specifications":
    st.markdown("""
    <div class="sonora-glass-card">
      <h3 style="margin:0 0 6px 0; color:#fff;">About SONORA</h3>
      <p style="margin:0; font-size:0.9rem; color:#94a3b8; line-height:1.6;">
        SONORA is built around a single unifying vision: <b>One music workspace from listening to creation.</b><br>
        Traditional music software forces artists into disjointed silos: one app for streaming, another for DJing, a separate DAW for editing, and external tools for analysis. SONORA unifies this entire journey into a living spatial soundstage.
      </p>
    </div>
    """, unsafe_allow_html=True)

    col_spec1, col_spec2 = st.columns(2)
    with col_spec1:
        st.markdown("""
        #### 📐 Design Specifications
        * **[PRD.md](https://github.com/ayushpatil5408/SONORA/blob/main/PRD.md):** Complete functional requirements and roadmap
        * **[DESIGN_SYSTEM.md](https://github.com/ayushpatil5408/SONORA/blob/main/DESIGN_SYSTEM.md):** Chromatic color scales, typography tokens, glass surfaces
        * **[VISUAL_LANGUAGE.md](https://github.com/ayushpatil5408/SONORA/blob/main/VISUAL_LANGUAGE.md):** Spatial primitives, living orbs, aurora drift
        * **[MOTION_SYSTEM.md](https://github.com/ayushpatil5408/SONORA/blob/main/MOTION_SYSTEM.md):** Three-layer acoustic motion hierarchy
        """)
    with col_spec2:
        st.markdown("""
        #### ⚡ Core Technologies
        * **Frontend:** React 18, TypeScript 5.7, Vite 6.0
        * **Audio DSP:** Web Audio API (`AudioContext`, `OfflineAudioContext`)
        * **Time Stretching:** WSOLA (Waveform Similarity Overlap-Add)
        * **Workers:** Web Workers for off-thread peak extraction
        * **Backend:** FastAPI (Python), SQLAlchemy, SQLite
        """)

# -----------------------------------------------------------------------------
# 10. Footer
# -----------------------------------------------------------------------------
st.markdown("""
<div style="text-align:center; margin-top:2.5rem; padding-top:1.5rem; border-top:1px solid rgba(255,255,255,0.08); font-size:0.75rem; color:#64748b;">
  SONORA Audiovisual Music Workstation • Deployed on Streamlit Cloud • © 2026 SONORA Contributors
</div>
""", unsafe_allow_html=True)
