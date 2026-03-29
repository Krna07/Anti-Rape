import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Trophy, Award, ShieldCheck, User, Star, Heart } from 'lucide-react';

const ranks = [
  { icon: <Award size={20} color="#FBBF24"/> }, // Gold
  { icon: <Award size={20} color="#94A3B8"/> }, // Silver
  { icon: <Award size={20} color="#B45309"/> }  // Bronze
];

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    axios.get(`${API}/users/leaderboard`)
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="center"><div className="spinner"/></div>;

  return (
    <div>
      <div className="sec-title" style={{display:'flex',alignItems:'center',gap:6}}><Trophy size={20}/> Hero Leaderboard</div>
      <p style={{color:'var(--muted)',fontSize:13,marginBottom:18}}>Top rescuers by Hero Points</p>
      {users.length === 0 ? (
        <div className="empty"><div className="ico"><Trophy size={40} color="var(--muted)" strokeWidth={1}/></div><p>No heroes yet. Be the first!</p></div>
      ) : users.map((u, i) => (
        <div key={u._id} className={`lb-row${i<3?` lb-${i+1}`:''}`}>
          <div className="lb-rank">{i < 3 ? ranks[i].icon : `#${i+1}`}</div>
          <div>
            <div className="lb-name">
              {u.name}
              {u._id === user?._id && <span className="badge badge-blue" style={{marginLeft:8,fontSize:11}}>You</span>}
            </div>
            <div style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:4}}>
              {u.role==='rescuer'?<><ShieldCheck size={14}/> Rescuer</>:<><User size={14}/> User</>} · {u.alertsResponded??0} responses
            </div>
          </div>
          <div style={{marginLeft:'auto',textAlign:'right'}}>
            <div className="lb-pts" style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4}}><Star size={14} color="var(--orange)"/> {u.heroPoints}</div>
            <div className="lb-saved" style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4}}><Heart size={14} color="var(--red)"/> {u.savedCount} saved</div>
          </div>
        </div>
      ))}
    </div>
  );
}
