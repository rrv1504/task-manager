const Task = require("../models/Task");

const getTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, priority, category } = req.body;

    if (!title || !title.trim()) {
      const error = new Error("Task title is required.");
      error.status = 400;
      throw error;
    }

    const task = await Task.create({
      title,
      description,
      dueDate: dueDate || null,
      priority,
      category,
      user: req.user._id
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      const error = new Error("Task not found.");
      error.status = 404;
      throw error;
    }

    if (typeof req.body.title === "string") {
      if (!req.body.title.trim()) {
        const error = new Error("Task title cannot be empty.");
        error.status = 400;
        throw error;
      }
      task.title = req.body.title;
    }

    if (typeof req.body.description === "string") {
      task.description = req.body.description;
    }

    if (typeof req.body.completed === "boolean") {
      task.completed = req.body.completed;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "dueDate")) {
      task.dueDate = req.body.dueDate || null;
    }

    if (["low", "medium", "high"].includes(req.body.priority)) {
      task.priority = req.body.priority;
    }

    if (typeof req.body.category === "string") {
      task.category = req.body.category.trim() || "General";
    }

    if (typeof req.body.timeSpent === "number" && req.body.timeSpent >= 0) {
      task.timeSpent = req.body.timeSpent;
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      const error = new Error("Task not found.");
      error.status = 404;
      throw error;
    }

    res.json({ id: req.params.id });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
