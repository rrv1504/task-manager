import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  ClipboardList,
  Flag,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Tag,
  Timer,
  Trash2,
  User,
  X,
} from "lucide-react";
import { clearAuth, getStoredAuth, request, storeAuth } from "./utils/api";

const emptyTask = {
  title: "",
  description: "",
  dueDate: "",
  priority: "medium",
  category: "General",
};

const defaultCategories = ["General", "College", "Work", "Personal"];

const formatSeconds = (seconds = 0) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }

  return `${mins}m ${secs}s`;
};

const toDateKey = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const key = toDateKey(value);
  if (!key) {
    return "No due date";
  }

  const [year, month, day] = key.split("-");
  return `${day}-${month}-${year}`;
};

const getDueStatus = (task) => {
  if (task.completed) {
    return "Completed";
  }

  if (!task.dueDate) {
    return "No due date";
  }

  const today = toDateKey(new Date());
  const due = toDateKey(task.dueDate);

  if (due < today) {
    return "Overdue";
  }

  if (due === today) {
    return "Due today";
  }

  return "Upcoming";
};

function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyTask);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [runningTimer, setRunningTimer] = useState(null);
  const [tick, setTick] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [categories, setCategories] = useState(defaultCategories);
  const [newCategory, setNewCategory] = useState("");
  const [focusTaskId, setFocusTaskId] = useState(null);

  useEffect(() => {
    if (!auth?.token) {
      return;
    }

    loadTasks();
    const saved = localStorage.getItem(
      `task_manager_categories_${auth.user.id}`,
    );
    setCategories(saved ? JSON.parse(saved) : defaultCategories);
  }, [auth?.token]);

  useEffect(() => {
    if (!runningTimer) {
      return;
    }

    const intervalId = window.setInterval(
      () => setTick((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(intervalId);
  }, [runningTimer]);

  useEffect(() => {
    if (!focusTaskId) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setFocusTaskId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [focusTaskId]);

  const stats = useMemo(() => {
    const today = toDateKey(new Date());
    const completed = tasks.filter((task) => task.completed).length;
    const dueToday = tasks.filter(
      (task) =>
        !task.completed && task.dueDate && toDateKey(task.dueDate) === today,
    ).length;
    const overdue = tasks.filter(
      (task) =>
        !task.completed && task.dueDate && toDateKey(task.dueDate) < today,
    ).length;
    const totalSeconds = tasks.reduce(
      (sum, task) => sum + (task.timeSpent || 0),
      0,
    );
    const highPriority = tasks.filter(
      (task) => task.priority === "high" && !task.completed,
    ).length;

    return {
      total: tasks.length,
      completed,
      active: tasks.length - completed,
      dueToday,
      overdue,
      highPriority,
      totalSeconds,
      completionRate: tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0,
    };
  }, [tasks]);

  const notifications = useMemo(() => {
    const notes = [];
    if (stats.overdue) {
      notes.push(
        `${stats.overdue} overdue task${stats.overdue > 1 ? "s" : ""} need attention.`,
      );
    }
    if (stats.dueToday) {
      notes.push(
        `${stats.dueToday} task${stats.dueToday > 1 ? "s are" : " is"} due today.`,
      );
    }
    if (stats.highPriority) {
      notes.push(
        `${stats.highPriority} high priority task${stats.highPriority > 1 ? "s" : ""} open.`,
      );
    }
    return notes.length
      ? notes
      : ["You are clear for now. Add tasks or plan your day."];
  }, [stats]);

  const filteredTasks = useMemo(() => {
    const today = toDateKey(new Date());
    return tasks
      .filter((task) => {
        const matchesQuery =
          task.title.toLowerCase().includes(query.toLowerCase()) ||
          (task.description || "")
            .toLowerCase()
            .includes(query.toLowerCase()) ||
          (task.category || "").toLowerCase().includes(query.toLowerCase());

        if (!matchesQuery) {
          return false;
        }

        if (filter === "active") return !task.completed;
        if (filter === "completed") return task.completed;
        if (filter === "today")
          return (
            !task.completed && task.dueDate && toDateKey(task.dueDate) === today
          );
        if (filter === "overdue")
          return (
            !task.completed && task.dueDate && toDateKey(task.dueDate) < today
          );
        return true;
      })
      .sort((first, second) => {
        if (first.completed !== second.completed) {
          return first.completed ? 1 : -1;
        }

        const firstDue = toDateKey(first.dueDate) || "9999-12-31";
        const secondDue = toDateKey(second.dueDate) || "9999-12-31";
        return firstDue.localeCompare(secondDue);
      });
  }, [filter, query, tasks]);

  const categoryOptions = useMemo(() => {
    const taskCategories = tasks.map((task) => task.category).filter(Boolean);
    return [
      ...new Set([...defaultCategories, ...categories, ...taskCategories]),
    ];
  }, [categories, tasks]);

  const focusTask = useMemo(
    () => tasks.find((task) => task._id === focusTaskId) || null,
    [focusTaskId, tasks],
  );

  const liveTime = (task) => {
    if (runningTimer?.taskId !== task._id) {
      return task.timeSpent || 0;
    }

    return (
      (task.timeSpent || 0) +
      Math.floor((Date.now() - runningTimer.startedAt) / 1000)
    );
  };

  const stopTimerForTask = async (task) => {
    if (runningTimer?.taskId !== task._id) {
      return task;
    }

    const elapsed = Math.floor((Date.now() - runningTimer.startedAt) / 1000);
    const updated = await request(`/tasks/${task._id}`, {
      method: "PUT",
      body: JSON.stringify({ timeSpent: (task.timeSpent || 0) + elapsed }),
    });

    updateTaskInState(updated);
    setRunningTimer(null);
    return updated;
  };

  const startTimerForTask = async (task) => {
    if (task.completed) {
      return;
    }

    if (runningTimer?.taskId === task._id) {
      return;
    }

    if (runningTimer) {
      const currentTask = tasks.find(
        (item) => item._id === runningTimer.taskId,
      );
      if (currentTask) {
        await stopTimerForTask(currentTask);
      } else {
        setRunningTimer(null);
      }
    }

    setTick(0);
    setRunningTimer({ taskId: task._id, startedAt: Date.now() });
  };

  const toggleTimer = async (task) => {
    if (task.completed) {
      return;
    }

    if (runningTimer?.taskId === task._id) {
      await stopTimerForTask(task);
      return;
    }

    await startTimerForTask(task);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setTasks(await request("/tasks"));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : authForm;
      const data = await request(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      storeAuth(data);
      setAuth(data);
      setAuthForm({ name: "", email: "", password: "" });
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
    setAuth(null);
    setTasks([]);
    setMessage("");
    setRunningTimer(null);
  };

  const addTask = async (event) => {
    event.preventDefault();
    try {
      const task = await request("/tasks", {
        method: "POST",
        body: JSON.stringify(taskForm),
      });
      setTasks((current) => [task, ...current]);
      setTaskForm(emptyTask);
      setMessage("Task added successfully.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const createCategory = () => {
    const category = newCategory.trim();
    if (!category) {
      return;
    }

    const updated = [...new Set([...categories, category])];
    setCategories(updated);
    localStorage.setItem(
      `task_manager_categories_${auth.user.id}`,
      JSON.stringify(updated),
    );
    setTaskForm((current) => ({ ...current, category }));
    setNewCategory("");
    setMessage("Category created.");
  };

  const updateTaskInState = (updated) => {
    setTasks((current) =>
      current.map((item) => (item._id === updated._id ? updated : item)),
    );
  };

  const toggleTask = async (task) => {
    try {
      const payload = { completed: !task.completed };

      if (!task.completed && runningTimer?.taskId === task._id) {
        const elapsed = Math.floor(
          (Date.now() - runningTimer.startedAt) / 1000,
        );
        payload.timeSpent = (task.timeSpent || 0) + elapsed;
      }

      const updated = await request(`/tasks/${task._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      updateTaskInState(updated);

      if (updated.completed && runningTimer?.taskId === updated._id) {
        setRunningTimer(null);
      }

      if (updated.completed && focusTaskId === updated._id) {
        setFocusTaskId(null);
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEdit = (task) => {
    setEditingId(task._id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate ? toDateKey(task.dueDate) : "",
      priority: task.priority || "medium",
      category: task.category || "General",
    });
  };

  const saveTask = async (taskId) => {
    try {
      const updated = await request(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      updateTaskInState(updated);
      setEditingId(null);
      setEditForm(emptyTask);
      setMessage("Task updated.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await request(`/tasks/${taskId}`, { method: "DELETE" });
      setTasks((current) => current.filter((task) => task._id !== taskId));
      if (runningTimer?.taskId === taskId) {
        setRunningTimer(null);
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setMessage("Browser notifications are not available here.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("Task Manager", { body: notifications[0] });
    }
    setMessage(
      permission === "granted"
        ? "Notifications enabled."
        : "Notifications were not enabled.",
    );
  };

  if (!auth?.token) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="brand-mark">
            <ClipboardList size={30} aria-hidden="true" />
          </div>
          <h1>Task Manager</h1>
          <p className="lede">
            Create an account, plan your day, and track your work in one place.
          </p>
          <div className="segmented" role="tablist" aria-label="Authentication mode">
            <button
              className={authMode === "login" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("register")}
            >
              Sign up
            </button>
          </div>

          <form className="stack" onSubmit={handleAuth}>
            {authMode === "register" && (
              <label>
                Name
                <input
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm({ ...authForm, name: event.target.value })
                  }
                  placeholder="Your name"
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm({ ...authForm, email: event.target.value })
                }
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({ ...authForm, password: event.target.value })
                }
                placeholder="Minimum 6 characters"
                minLength="6"
                required
              />
            </label>
            {message && <p className="error">{message}</p>}
            <button className="primary" type="submit" disabled={loading}>
              {authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={`dashboard ${sidebarOpen ? "" : "sidebar-closed"}`}>
      <aside className="sidebar">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="profile">
          <div className="avatar">
            <User size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Profile</p>
            <h2>{auth.user.name}</h2>
            <span>{auth.user.email}</span>
          </div>
        </div>

        <div className="profile-stats">
          <div>
            <span>{stats.completionRate}%</span>
            <p>Completion</p>
          </div>
          <div>
            <span>{stats.overdue}</span>
            <p>Overdue</p>
          </div>
        </div>

        <div className="progress-panel" aria-label="Completion progress">
          <div>
            <span>Daily progress</span>
            <strong>
              {stats.completed}/{stats.total || 0}
            </strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${stats.completionRate}%` }} />
          </div>
        </div>

        <button
          className="icon-text full"
          type="button"
          onClick={requestNotifications}
        >
          <Bell size={18} aria-hidden="true" />
          Enable Notifications
        </button>
        <button className="icon-text full" type="button" onClick={logout}>
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </aside>

      <section className="main-panel">
        <header className="hero">
          <div>
            <p className="eyebrow">Daily workspace</p>
            <h1>
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h1>
            <p className="hero-copy">
              Plan, focus, and finish your most important work.
            </p>
          </div>
          <div className="notification-strip">
            <Bell size={18} aria-hidden="true" />
            <span>{notifications[0]}</span>
          </div>
        </header>

        <section className="summary-grid compact" aria-label="Task summary">
          <div>
            <span>{stats.total}</span>
            <p>Total</p>
          </div>
          <div>
            <span>{stats.active}</span>
            <p>Active</p>
          </div>
          <div>
            <span>{stats.completed}</span>
            <p>Completed</p>
          </div>
          <div>
            <span>{stats.dueToday}</span>
            <p>Due today</p>
          </div>
        </section>

        <section className="workspace">
          <form className="task-form" onSubmit={addTask}>
            <div className="form-title">
              <div>
                <p className="eyebrow">Quick capture</p>
                <h2>Add Task</h2>
              </div>
              <ClipboardList size={22} aria-hidden="true" />
            </div>
            <label>
              Title
              <input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, title: event.target.value })
                }
                placeholder="Study React"
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, description: event.target.value })
                }
                placeholder="Notes, deadline, or context"
                rows="4"
              />
            </label>

            <button
              className="details-toggle"
              type="button"
              onClick={() => setDetailsOpen((open) => !open)}
            >
              <span>
                <SlidersHorizontal size={17} aria-hidden="true" />
                Task details
              </span>
              {detailsOpen ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>

            {detailsOpen && (
              <div className="details-panel">
                <div className="form-row">
                  <label>
                    Due date
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          dueDate: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Priority
                    <select
                      value={taskForm.priority}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          priority: event.target.value,
                        })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>
                <label>
                  Category
                  <select
                    value={taskForm.category}
                    onChange={(event) =>
                      setTaskForm({ ...taskForm, category: event.target.value })
                    }
                  >
                    {categoryOptions.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="category-create">
                  <input
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="Create category"
                  />
                  <button type="button" onClick={createCategory}>
                    <Tag size={17} aria-hidden="true" />
                    Add
                  </button>
                </div>
              </div>
            )}

            <button className="primary icon-text" type="submit">
              <Plus size={18} aria-hidden="true" />
              Add task
            </button>
            {message && <p className="notice">{message}</p>}
          </form>

          <section className="task-board" aria-label="Tasks">
            <div className="board-toolbar">
              <div>
                <h2>Tasks</h2>
                <span>{filteredTasks.length} shown</span>
              </div>
              <label className="search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tasks"
                />
              </label>
            </div>

            <div className="filter-tabs" aria-label="Task filters">
              {["all", "active", "today", "overdue", "completed"].map(
                (item) => (
                  <button
                    key={item}
                    className={filter === item ? "active" : ""}
                    type="button"
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>

            {filteredTasks.length === 0 && !loading ? (
              <div className="empty-state">
                <BarChart3 size={38} aria-hidden="true" />
                <p>No tasks match this view.</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <article
                  className={`task-card ${task.completed ? "done" : ""}`}
                  key={task._id}
                >
                  <button
                    className="toggle"
                    type="button"
                    onClick={() => toggleTask(task)}
                    aria-label={
                      task.completed ? "Mark active" : "Mark completed"
                    }
                    title={task.completed ? "Mark active" : "Mark completed"}
                  >
                    {task.completed ? (
                      <Check size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  {editingId === task._id ? (
                    <div className="edit-area">
                      <input
                        value={editForm.title}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            title: event.target.value,
                          })
                        }
                        required
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            description: event.target.value,
                          })
                        }
                        rows="3"
                      />
                      <div className="form-row">
                        <input
                          type="date"
                          value={editForm.dueDate}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              dueDate: event.target.value,
                            })
                          }
                        />
                        <select
                          value={editForm.priority}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              priority: event.target.value,
                            })
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <select
                          value={editForm.category}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              category: event.target.value,
                            })
                          }
                        >
                          {categoryOptions.map((category) => (
                            <option value={category} key={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="task-copy">
                      <div className="task-heading">
                        <h3>{task.title}</h3>
                      </div>
                      {task.description && <p>{task.description}</p>}
                      <div className="task-meta">
                        <div className="task-meta-item">
                          <span>Due date</span>
                          <strong className={`due-pill ${getDueStatus(task).toLowerCase().replaceAll(" ", "-")}`}>
                            <span className="due-pill-text">
                              <CalendarDays size={15} /> {formatDate(task.dueDate)} - {getDueStatus(task)}
                            </span>
                            <CalendarDays size={15} /> {formatDate(task.dueDate)} · {getDueStatus(task)}
                          </strong>
                        </div>
                        <div className="task-meta-item">
                          <span>Priority</span>
                          <strong className={`priority ${task.priority}`}>{task.priority}</strong>
                        </div>
                        <div className="task-meta-item">
                          <span>Category</span>
                          <strong>{task.category || "General"}</strong>
                        </div>
                        <div className="task-meta-item">
                          <span>Timer</span>
                          <strong>{formatSeconds(liveTime(task))}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="actions">
                    <button
                      className={`timer-button ${runningTimer?.taskId === task._id ? "running" : ""}`}
                      type="button"
                      onClick={() =>
                        !task.completed && setFocusTaskId(task._id)
                      }
                      title={
                        task.completed
                          ? "Timer disabled for completed tasks"
                          : "Open focus timer"
                      }
                      disabled={task.completed}
                    >
                      <Timer size={18} />
                    </button>
                    {editingId === task._id ? (
                      <>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => saveTask(task._id)}
                          aria-label="Save task"
                          title="Save"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel editing"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => startEdit(task)}
                          aria-label="Edit task"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          className="icon-button danger"
                          type="button"
                          onClick={() => deleteTask(task._id)}
                          aria-label="Delete task"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      </section>

      {focusTask && (
        <div
          className="focus-overlay"
        >
          <section className="focus-modal">
            <div className="focus-modal__top">
              <div>
                <p className="eyebrow">Focus mode</p>
                <h2>{focusTask.title}</h2>
                <p className="focus-modal__subtitle">
                  {focusTask.description ||
                    "Stay on this task until you are done."}
                </p>
              </div>
              <button
                className="focus-close"
                type="button"
                onClick={() => setFocusTaskId(null)}
                aria-label="Close focus timer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="focus-clock" aria-label="Focused task timer">
              {formatSeconds(liveTime(focusTask))}
            </div>

            <div className="focus-meta">
              <div>
                <span>Due date</span>
                <strong>{formatDate(focusTask.dueDate)}</strong>
              </div>
              <div>
                <span>Priority</span>
                <strong className={`priority ${focusTask.priority}`}>
                  {focusTask.priority}
                </strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{focusTask.category || "General"}</strong>
              </div>
            </div>

            <div className="focus-actions">
              <button
                className="icon-text"
                typee ="button"
                onClick={() => setFocusTaskId(null)}
              >
                Close
              </button>
              <button
                className={`primary icon-text ${runningTimer?.taskId === focusTask._id ? "is-running" : ""}`}
                type="button"
                onClick={() => toggleTimer(focusTask)}
              >
                <Timer size={18} aria-hidden="true" />
                {runningTimer?.taskId === focusTask._id
                  ? "Pause timer"
                  : "Start timer"}
              </button>
              <button
                className="icon-text"
                type="button"
                onClick={() => toggleTask(focusTask)}
              >
                <Check size={18} aria-hidden="true" />
                Mark complete
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
