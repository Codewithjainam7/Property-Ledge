const fs = require('fs');

const file = 'f:/Property Ledge/src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '            {/* 2. Analytics Row */}';
const endMarker = '            {/* 3. Quick Actions */}';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = `            {/* 2. Activity & Tasks Row */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              
              {/* Upcoming Events */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Upcoming Events</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer">View Calendar</span>
                </div>
                <div className="flex-1 space-y-4">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center w-10 shrink-0">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{event.month}</span>
                        <span className="text-base font-black text-on-surface leading-none">{event.day}</span>
                      </div>
                      <div className="flex-1 pb-4 border-b border-outline-variant/30 last:border-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="text-sm font-bold text-on-surface">{event.title}</span>
                          <span className="text-[10px] font-bold text-on-surface-variant">{event.time}</span>
                        </div>
                        <span className="text-xs text-on-surface-variant font-medium">{event.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-2 py-2 text-xs font-bold text-primary hover:underline flex justify-center items-center gap-1">
                  See all events &rarr;
                </button>
              </motion.div>

              {/* Recent Activity */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Recent Activity</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                </div>
                <div className="flex-1 space-y-5">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="flex gap-3">
                      <div className={\`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 \${activity.bg}\`}>
                        <activity.icon className={\`w-4 h-4 \${activity.color}\`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-on-surface leading-tight mb-0.5 pr-8 relative">
                          {activity.title}
                          <span className="absolute right-0 top-0 text-[10px] font-medium text-outline">{activity.time}</span>
                        </div>
                        <div className="text-xs text-on-surface-variant font-medium">{activity.author}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Tasks */}
              <motion.div variants={itemVariants} className="bg-surface p-6 rounded-[24px] border border-outline-variant/50 shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-on-surface">Tasks</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant hover:text-primary cursor-pointer bg-surface-container px-2 py-1 rounded-md">View All</span>
                </div>
                <div className="flex-1 space-y-4">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 group cursor-pointer">
                      <div className="w-4 h-4 rounded border border-outline mt-0.5 flex items-center justify-center group-hover:border-primary transition-colors"></div>
                      <div className="flex-1 pb-3 border-b border-outline-variant/30 last:border-0 flex justify-between items-start gap-2">
                        <span className="text-sm font-bold text-on-surface">{task.title}</span>
                        <span className={\`text-[10px] font-bold whitespace-nowrap \${task.tagColor}\`}>{task.tag}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

            </motion.div>\n\n`;

    content = content.substring(0, startIdx) + newContent + content.substring(endIdx);
    fs.writeFileSync(file, content);
    console.log("Successfully replaced.");
} else {
    console.log("Could not find start or end marker.");
}
