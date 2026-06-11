namespace PrismShift
{
    public enum GameState
    {
        MainMenu,
        LevelSelect,
        Playing,
        Moving,
        Paused,
        Victory,
        Defeat
    }

    public enum OrbColor
    {
        None   = -1,
        Red    = 0,
        Blue   = 1,
        Green  = 2,
        Yellow = 3,
        Purple = 4,
        Cyan   = 5
    }

    public enum CellType
    {
        Empty,
        Normal,
        Blocked,
        Portal
    }

    public enum SwipeDirection
    {
        None,
        Left,
        Right,
        Up,
        Down
    }

    public enum PortalState
    {
        Active,
        Highlighted,
        Completed,
        Error
    }

    public enum OrbState
    {
        Normal,
        Moving,
        Absorbed,
        Error
    }
}
