using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Gestiona todos los efectos de sonido. Si un clip no está asignado,
    /// lo omite silenciosamente para no romper el juego.
    /// </summary>
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [Header("SFX — asignar desde Inspector o dejar vacío")]
        [SerializeField] private AudioClip sfxButtonClick;
        [SerializeField] private AudioClip sfxSwipe;
        [SerializeField] private AudioClip sfxInvalidMove;
        [SerializeField] private AudioClip sfxPortalComplete;
        [SerializeField] private AudioClip sfxLevelWin;
        [SerializeField] private AudioClip sfxLevelLose;
        [SerializeField] private AudioClip sfxStarAppear;

        [Header("Volúmenes")]
        [Range(0f, 1f)] [SerializeField] private float sfxVolume = 0.8f;

        private AudioSource _source;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            _source = gameObject.AddComponent<AudioSource>();
            _source.playOnAwake = false;
        }

        public void PlayButtonClick()   => Play(sfxButtonClick);
        public void PlaySwipe()         => Play(sfxSwipe);
        public void PlayInvalidMove()   => Play(sfxInvalidMove);
        public void PlayPortalComplete()=> Play(sfxPortalComplete);
        public void PlayLevelWin()      => Play(sfxLevelWin);
        public void PlayLevelLose()     => Play(sfxLevelLose);
        public void PlayStarAppear()    => Play(sfxStarAppear);

        private void Play(AudioClip clip)
        {
            if (clip == null || _source == null) return;
            _source.PlayOneShot(clip, sfxVolume);
        }
    }
}
